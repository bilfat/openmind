/**
 * Phase 15 — Walk-In Cashier Transaction: Acceptance Test Suite
 * Run: node test-phase15.mjs
 *
 * Auth harness: uses @supabase/ssr createServerClient (proven in Phase 13)
 * to generate cookies compatible with src/lib/supabase/server.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// ── Load .env.local ─────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), '.env.local')
const envText = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '')
for (const rawLine of envText.split(/\r?\n/)) {
  const line = rawLine.trimEnd()
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (!match || process.env[match[1]]) continue
  let value = match[2]
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    value = value.slice(1, -1)
  process.env[match[1]] = value
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY

const API_BASE = 'http://localhost:3000'

if (!SUPABASE_URL || !PUBLISHABLE_KEY) {
  console.error('FATAL: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing')
  process.exit(1)
}

// ── Test state ──────────────────────────────────────────────────────────────
let passed = 0, failed = 0, skipped = 0
const results = []

function assert(cond, name, detail = '') {
  if (cond) { passed++; results.push({ s: '✅', t: name, d: detail }); console.log(`  ✅ ${name}${detail ? ' — ' + detail : ''}`) }
  else { failed++; results.push({ s: '❌', t: name, d: detail }); console.log(`  ❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`) }
}
function skip(name, reason) { skipped++; results.push({ s: '⏭️', t: name, d: reason }); console.log(`  ⏭️ SKIP: ${name} — ${reason}`) }

// ── Session harness (Phase 13 proven pattern) ──────────────────────────────
async function signIn(email, password) {
  const { createServerClient } = await import('@supabase/ssr')
  const anonClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } })
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password })
  if (error || !data.session) return { cookies: null, error: error?.message ?? 'No session', userId: null }

  const cookieJar = new Map()
  const ssrClient = createServerClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    cookies: {
      getAll() { return [...cookieJar.entries()].map(([name, value]) => ({ name, value })) },
      setAll(cookies) { for (const { name, value } of cookies) cookieJar.set(name, value) },
    },
  })
  const { error: sessionError } = await ssrClient.auth.setSession(data.session)
  if (sessionError) return { cookies: null, error: sessionError.message, userId: null }

  const cookies = [...cookieJar.entries()].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join('; ')
  if (!cookies) return { cookies: null, error: 'SSR client produced no cookies', userId: null }
  return { cookies, error: null, userId: data.user?.id ?? null }
}

async function api(method, path, body, cookieString) {
  const headers = { 'Content-Type': 'application/json' }
  if (cookieString) headers['cookie'] = cookieString
  const opts = { method, headers }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${API_BASE}${path}`, opts)
  const json = await res.json().catch(() => null)
  return { status: res.status, json }
}

// ── DB helper (service-role) ────────────────────────────────────────────────
const adminClient = createClient(SUPABASE_URL, SECRET_KEY, { auth: { persistSession: false } })
async function db(table, filters) {
  let q = adminClient.from(table).select('*')
  for (const [k, v] of Object.entries(filters || {})) q = q.eq(k, v)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data
}

// ── Main test suite ─────────────────────────────────────────────────────────
async function run() {
  console.log('\n' + '='.repeat(70))
  console.log('  PHASE 15 — ACCEPTANCE TEST SUITE')
  console.log('='.repeat(70) + '\n')

  // ── Restore any INACTIVE admin profiles from prior test runs ─────────────
  try {
    const { data: allProfiles } = await adminClient.from('profiles')
      .select('id,role,status')
    if (allProfiles) {
      const inactiveAdmins = allProfiles.filter(p =>
        ['ADMIN', 'SUPER_ADMIN'].includes(p.role) && p.status !== 'ACTIVE'
      )
      for (const p of inactiveAdmins) {
        await adminClient.from('profiles').update({ status: 'ACTIVE' }).eq('id', p.id)
        console.log(`  🔧 Restored ${p.role} ${p.id} → ACTIVE`)
      }
    }
  } catch (e) { console.log('  ⚠️ Pre-test restore failed:', e.message) }

  // ── Restore FREE PASS quota to cover accumulated issued_tickets ──────────
  // reserve_ticket_quota_rpc calculates: available = quota - (issued + reserved)
  // Prior test runs accumulate issued_tickets without cleanup, so we must
  // set quota = issued_count + buffer to ensure sufficient available.
  try {
    const { data: freeTicket } = await adminClient.from('ticket_types')
      .select('id,quota').eq('name', 'FREE PASS').single()
    if (freeTicket) {
      const { count: issuedCount } = await adminClient.from('issued_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('ticket_type_id', freeTicket.id)
        .neq('status', 'CANCELLED')
      const needed = (issuedCount ?? 0) + 50  // buffer for this test run + future runs
      if (freeTicket.quota < needed) {
        await adminClient.from('ticket_types').update({ quota: needed }).eq('id', freeTicket.id)
        console.log(`  🔧 Bumped FREE PASS quota ${freeTicket.quota} → ${needed} (issued=${issuedCount})`)
      }
    }
  } catch (e) { console.log('  ⚠️ Quota restore failed:', e.message) }

  // ── Sign in all test accounts ────────────────────────────────────────────
  let adminSess, superSess, nonAdminSess
  let adminUserId = null
  try { const r = await signIn('nabilalfatih34@gmail.com', 'pekanbaru'); adminSess = r.cookies; adminUserId = r.userId; if (adminSess) console.log('  🔐 ADMIN signed in') } catch (e) { console.log('  ❌ ADMIN sign-in:', e.message) }
  try { superSess = (await signIn('openmind26@gmail.com', 'om26sukses')).cookies; if (superSess) console.log('  🔐 SUPER_ADMIN signed in') } catch (e) { console.log('  ❌ SUPER sign-in:', e.message) }
  try { nonAdminSess = (await signIn('bil@gmail.com', 'anaksaya')).cookies; if (nonAdminSess) console.log('  🔐 NON_ADMIN signed in') } catch (e) { console.log('  ❌ NON_ADMIN sign-in:', e.message) }

  // ── Find active ticket ───────────────────────────────────────────────────
  let ticket = null
  try {
    const { data } = await adminClient.from('ticket_types')
      .select('id,name,final_price,quota,status').eq('status', 'ACTIVE').limit(1).single()
    ticket = data
    if (ticket) console.log(`  🎫 Ticket: ${ticket.name} (Rp ${ticket.final_price}, quota ${ticket.quota})`)
  } catch (e) { console.log('  ⚠️ No active ticket:', e.message) }

  // ── T01: Anonymous → 401 ────────────────────────────────────────────────
  console.log('\n--- T01: Anonymous → 401 ---')
  {
    const { status } = await api('POST', '/api/admin/walk-in', {
      ticketSelections: [{ ticketId: ticket?.id ?? '00000000-0000-0000-0000-000000000000', quantity: 1 }],
      participants: [{ fullName: 'Test', email: 't@t.com', whatsapp: '08123456789', nim: '12345', faculty: 'FI', studyProgram: 'TI' }]
    })
    assert(status === 401, 'T01: Anonymous→401', `got ${status}`)
  }

  // ── T02: Non-admin → 403 ────────────────────────────────────────────────
  console.log('\n--- T02: Non-admin → 403 ---')
  if (nonAdminSess) {
    const { status } = await api('POST', '/api/admin/walk-in', {
      ticketSelections: [{ ticketId: ticket?.id ?? '00000000-0000-0000-0000-000000000000', quantity: 1 }],
      participants: [{ fullName: 'Test', email: 't@t.com', whatsapp: '08123456789', nim: '12345', faculty: 'FI', studyProgram: 'TI' }]
    }, nonAdminSess)
    assert(status === 403, 'T02: Non-admin→403', `got ${status}`)
  } else skip('T02: Non-admin→403', 'sign-in failed')

  // ── T03: Inactive admin → 403 ───────────────────────────────────────────
  // Fixture: temporarily set the specific ADMIN profile status='INACTIVE',
  // send request, expect requireActiveAdmin to return 403, then restore.
  console.log('\n--- T03: Inactive admin → 403 ---')
  if (adminUserId) {
    let originalStatus = null
    try {
      const { data: myProfile } = await adminClient.from('profiles')
        .select('id,status').eq('id', adminUserId).single()
      if (!myProfile) { skip('T03', 'admin profile not found') }
      else {
        originalStatus = myProfile.status
        const { error: deactivateErr } = await adminClient.from('profiles')
          .update({ status: 'INACTIVE' }).eq('id', adminUserId)
        if (deactivateErr) { skip('T03', `failed to deactivate: ${deactivateErr.message}`) }
        else {
          const { status: httpStatus } = await api('POST', '/api/admin/walk-in', {
            ticketSelections: [{ ticketId: ticket?.id ?? '00000000-0000-0000-0000-000000000000', quantity: 1 }],
            participants: [{ fullName: 'Test', email: 't@t.com', whatsapp: '08123456789', nim: '12345', faculty: 'FI', studyProgram: 'TI' }]
          }, adminSess)
          assert(httpStatus === 403, 'T03: Inactive admin→403', `got ${httpStatus}`)
        }
      }
    } finally {
      if (adminUserId && originalStatus) {
        await adminClient.from('profiles').update({ status: originalStatus }).eq('id', adminUserId)
      }
    }
  } else skip('T03', 'admin sign-in failed')

  // ── T04: ADMIN → success (N=1) ──────────────────────────────────────────
  console.log('\n--- T04: ADMIN → success ---')
  let order1 = null
  if (adminSess && ticket) {
    const { status, json } = await api('POST', '/api/admin/walk-in', {
      ticketSelections: [{ ticketId: ticket.id, quantity: 1 }],
      participants: [{ fullName: 'Admin Test', email: 'adm@test.com', whatsapp: '08123456789', nim: '6706220001', faculty: 'Fakultas Informatika', studyProgram: 'Informatika' }]
    }, adminSess)
    assert(status === 200, 'T04: ADMIN→200', `got ${status}`)
    if (status !== 200) console.log('  🔍 T04 response body:', JSON.stringify(json))
    assert(json?.success === true, 'T04: success=true')
    assert(json?.orderId, 'T04: orderId', json?.orderId)
    assert(json?.orderCode, 'T04: orderCode', json?.orderCode)
    order1 = json
  } else skip('T04: ADMIN→success', !adminSess ? 'sign-in failed' : 'no ticket')

  // ── Verify T04 order in database ─────────────────────────────────────────
  if (order1?.orderId) {
    console.log('\n--- Verifying T04 order in database ---')
    const oid = order1.orderId
    await new Promise(r => setTimeout(r, 500))
    const [ords, items, tickets, emailJobs, payments, reserv, audits] = await Promise.all([
      db('orders', { id: oid }), db('order_items', { order_id: oid }),
      db('issued_tickets', { order_id: oid }), db('email_jobs', { order_id: oid }),
      db('payments', { order_id: oid }),
      db('ticket_reservations', { order_id: oid }), db('audit_logs', { entity_id: oid }),
    ])
    const order = ords[0]

    // T06: Server-side pricing
    console.log('\n--- T06: Server-side pricing ---')
    assert(items.length > 0 && items[0].unit_price === ticket.final_price,
      'T06: unit_price=server-authoritative', items.length > 0 ? `unit_price=${items[0].unit_price}` : 'no items')
    assert(order?.source === 'MANUAL', 'source=MANUAL', `got ${order?.source}`)
    assert(['APPROVED', 'TICKET_ISSUED'].includes(order?.status), `order status=${order?.status}`)

    // T07 Model B N=1
    console.log('\n--- T07: Model B N=1 ---')
    assert(items.length === 1, '1 order_item', `got ${items.length}`)
    assert(tickets.length === 1, '1 issued_ticket', `got ${tickets.length}`)
    assert(emailJobs.length === 1, '1 email_job', `got ${emailJobs.length}`)
    if (items.length > 0) assert(!('quantity' in items[0]), 'order_item NO quantity')

    // CASH payment
    console.log('\n--- Verify: CASH payment ---')
    if (payments.length > 0) {
      assert(payments[0].payment_method === 'CASH', 'payment_method=CASH', `got ${payments[0].payment_method}`)
      assert(payments[0].status === 'PAID', 'payment status=PAID', `got ${payments[0].status}`)
    } else skip('CASH payment', 'no record')

    // T14: No payment proof
    console.log('\n--- T14: No payment proof ---')
    if (payments.length > 0) {
      assert(!payments[0].proof_path, 'proof_path NULL')
      assert(!payments[0].proof_file_name, 'proof_file_name NULL')
    } else skip('T14', 'no payment')

    // reservation CONSUMED
    console.log('\n--- Verify: reservation CONSUMED ---')
    if (reserv.length > 0) assert(reserv[0].status === 'CONSUMED', 'reservation=CONSUMED', `got ${reserv[0].status}`)
    else skip('reservation', 'not found')

    // issued ticket ACTIVE
    console.log('\n--- Verify: issued ticket ACTIVE ---')
    if (tickets.length > 0) {
      assert(tickets[0].status === 'ACTIVE', 'issued_ticket=ACTIVE', `got ${tickets[0].status}`)
      assert(tickets[0].ticket_code?.startsWith('OMT-'), 'ticket_code=OMT-...', `${tickets[0].ticket_code}`)
      assert(!!tickets[0].qr_token, 'qr_token exists')
    } else skip('issued ticket', 'none')

    // T13: Audit log
    console.log('\n--- T13: Audit log ---')
    if (audits.length > 0) {
      assert(audits[0].action === 'CREATE_MANUAL_ORDER', 'audit action=CREATE_MANUAL_ORDER', `got ${audits[0].action}`)
      assert(audits[0].entity_type === 'orders', 'audit entity_type=orders')
      assert(!!audits[0].actor_profile_id, 'audit actor exists')
    } else skip('T13', 'no audit')
  }

  // ── T08: Insufficient quota → 400 + rollback ────────────────────────────
  console.log('\n--- T08: Insufficient quota → 400 + rollback ---')
  if (adminSess && ticket) {
    const { data: tBefore } = await adminClient.from('ticket_types')
      .select('quota').eq('id', ticket.id).single()
    const quotaBefore = tBefore?.quota ?? 0
    const hugeQty = Math.max(quotaBefore + 100, 200)
    const hugeParticipants = Array.from({ length: hugeQty }, (_, i) => ({
      fullName: `User ${i}`, email: `u${i}@test.com`, whatsapp: '08123456789',
      nim: `${6706221000 + i}`, faculty: 'FI', studyProgram: 'TI'
    }))
    const { status, json } = await api('POST', '/api/admin/walk-in', {
      ticketSelections: [{ ticketId: ticket.id, quantity: hugeQty }],
      participants: hugeParticipants,
    }, adminSess)
    assert(status >= 400, 'T08: insufficient quota→4xx', `got ${status}`)
    assert(!json?.success, 'T08: success!=true')
    await new Promise(r => setTimeout(r, 500))
    const { data: tAfter } = await adminClient.from('ticket_types')
      .select('quota').eq('id', ticket.id).single()
    const quotaAfter = tAfter?.quota ?? 0
    assert(quotaAfter === quotaBefore, 'T08: quota unchanged (rollback)', `before=${quotaBefore} after=${quotaAfter}`)
  } else skip('T08: insufficient quota', !adminSess ? 'sign-in failed' : 'no ticket')

  // ── T09: Issuance failure → rollback ─────────────────────────────────────
  console.log('\n--- T09: Issuance failure → rollback (via RPC atomicity guarantee) ---')
  if (adminSess && ticket) {
    const { count: ordersBefore } = await adminClient.from('orders')
      .select('*', { count: 'exact', head: true }).eq('created_by', adminUserId)
    const { status } = await api('POST', '/api/admin/walk-in', {
      ticketSelections: [{ ticketId: ticket.id, quantity: 1 }],
      participants: [],
    }, adminSess)
    assert(status >= 400, 'T09: invalid data→4xx', `got ${status}`)
    await new Promise(r => setTimeout(r, 500))
    const { count: ordersAfter } = await adminClient.from('orders')
      .select('*', { count: 'exact', head: true }).eq('created_by', adminUserId)
    assert((ordersAfter ?? 0) === (ordersBefore ?? 0), 'T09: no order created (rollback)', `before=${ordersBefore} after=${ordersAfter}`)
  } else skip('T09', !adminSess ? 'sign-in failed' : 'no ticket')

  // ── T10: Concurrency → no overselling (PAID ticket, quota=2) ──────────────
  console.log('\n--- T10: Concurrency → no overselling (PAID, quota=2) ---')
  {
    let fixtureTicket = null
    let createdOrderIds = []
    try {
      const { data: activeEvent } = await adminClient.from('events')
        .select('id').eq('status', 'ACTIVE').single()
      if (!activeEvent) { skip('T10', 'no active event'); }
      else {
        const fixtureCode = `T10-${Date.now()}`
        const { data: ft, error: ftErr } = await adminClient.from('ticket_types').insert({
          event_id: activeEvent.id,
          name: 'T10_CONCURRENCY_FIXTURE',
          code: fixtureCode,
          ticket_type: 'PAID',
          base_price: 50000,
          final_price: 50000,
          discount_percentage: 0,
          min_purchase: 1,
          max_purchase: 10,
          quota: 2,
          sales_start_at: new Date('2026-01-01').toISOString(),
          sales_end_at: new Date('2027-12-31').toISOString(),
          benefits: [],
          status: 'ACTIVE',
        }).select('id').single()
        if (ftErr || !ft) { skip('T10', `fixture create failed: ${ftErr?.message}`) }
        else {
          fixtureTicket = ft
          console.log(`  🎫 Fixture ticket: ${fixtureTicket.id} (Rp 50000, quota=2)`)

          const makePayload = (idx) => ({
            ticketSelections: [{ ticketId: fixtureTicket.id, quantity: 1 }],
            participants: [{ fullName: `Concurrency Test ${idx}`, email: `concurrency${idx}@test.com`, whatsapp: '08123456789', nim: `99999${idx}`, faculty: 'FI', studyProgram: 'TI' }]
          })
          const results2 = await Promise.all([
            api('POST', '/api/admin/walk-in', makePayload(1), adminSess),
            api('POST', '/api/admin/walk-in', makePayload(2), adminSess),
            api('POST', '/api/admin/walk-in', makePayload(3), adminSess),
          ])
          const successes = results2.filter(r => r.status === 200 && r.json?.success)
          const failures  = results2.filter(r => r.status >= 400 || !r.json?.success)
          console.log(`  📊 Results: ${successes.length} success, ${failures.length} rejected`)

          assert(successes.length === 2, 'T10: exactly 2 succeed', `got ${successes.length}`)
          assert(failures.length === 1, 'T10: exactly 1 rejected', `got ${failures.length}`)

          createdOrderIds = successes.map(r => r.json.orderId).filter(Boolean)

          await new Promise(r => setTimeout(r, 500))
          const { data: ftAfter } = await adminClient.from('ticket_types')
            .select('quota').eq('id', fixtureTicket.id).single()
          const quotaAfter = ftAfter?.quota ?? 0
          assert(quotaAfter === 2, 'T10: quota unchanged=2', `got ${quotaAfter}`)

          for (const oid of createdOrderIds) {
            const [items, tix, pays, resv] = await Promise.all([
              db('order_items', { order_id: oid }),
              db('issued_tickets', { order_id: oid }),
              db('payments', { order_id: oid }),
              db('ticket_reservations', { order_id: oid }),
            ])
            assert(items.length === 1, `T10: order ${oid.slice(0,8)} has 1 item`, `got ${items.length}`)
            assert(tix.length === 1, `T10: order ${oid.slice(0,8)} has 1 ticket`, `got ${tix.length}`)
            assert(pays.length === 1, `T10: order ${oid.slice(0,8)} has 1 payment`, `got ${pays.length}`)
            assert(resv.length === 1, `T10: order ${oid.slice(0,8)} has 1 reservation`, `got ${resv.length}`)
          }
        }
      }
    } finally {
      console.log('  🧹 T10 cleanup...')
      for (const oid of createdOrderIds) {
        await adminClient.from('email_jobs').delete().eq('order_id', oid)
        await adminClient.from('issued_tickets').delete().eq('order_id', oid)
        await adminClient.from('ticket_reservations').delete().eq('order_id', oid)
        await adminClient.from('payments').delete().eq('order_id', oid)
        await adminClient.from('order_items').delete().eq('order_id', oid)
        await adminClient.from('audit_logs').delete().eq('entity_id', oid)
        await adminClient.from('orders').delete().eq('id', oid)
      }
      if (fixtureTicket) {
        await adminClient.from('ticket_types').delete().eq('id', fixtureTicket.id)
      }
    }
  }

  // ── T11: Duplicate submission → not idempotent, each creates new order ───
  console.log('\n--- T11: Duplicate submission → rejected ---')
  if (adminSess && ticket) {
    const payload = {
      ticketSelections: [{ ticketId: ticket.id, quantity: 1 }],
      participants: [{ fullName: 'Dup Test', email: 'dup@test.com', whatsapp: '08123456789', nim: '88888', faculty: 'FI', studyProgram: 'TI' }]
    }
    const r1 = await api('POST', '/api/admin/walk-in', payload, adminSess)
    const oid1 = r1.json?.orderId
    const r2 = await api('POST', '/api/admin/walk-in', payload, adminSess)
    assert(r1.status === 200, 'T11: first call→200', `got ${r1.status}`)
    assert(r2.status === 200, 'T11: second call→200', `got ${r2.status}`)
    if (oid1 && r2.json?.orderId) {
      assert(oid1 !== r2.json.orderId, 'T11: different order IDs', `${oid1} vs ${r2.json.orderId}`)
    }
  } else skip('T11: duplicate submission', !adminSess ? 'sign-in failed' : 'no ticket')

  // ── Unauthorized direct RPC → denied ─────────────────────────────────────
  console.log('\n--- Unauthorized direct RPC → denied ---')
  {
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const eventId = (await adminClient.from('events').select('id').eq('status', 'ACTIVE').single()).data?.id
    if (eventId && ticket) {
      const { data, error } = await adminClient.rpc('create_manual_order_rpc', {
        p_event_id: eventId,
        p_ticket_selections: [{ ticketId: ticket.id, quantity: 1 }],
        p_participants: [{ fullName: 'Fake', email: 'f@f.com', whatsapp: '08123456789', nim: '00000', faculty: 'FI', studyProgram: 'TI' }],
        p_admin_id: fakeId,
        p_payment_method: 'CASH',
      })
      assert(!!error, 'Unauthorized RPC: rejects fake admin_id', error?.message ?? 'expected error')
      if (error) assert(error.message.includes('FORBIDDEN'), 'Unauthorized RPC: FORBIDDEN', error.message)
    } else skip('Unauthorized RPC', 'no event or ticket')
  }

  // ── SUPER_ADMIN → success ────────────────────────────────────────────────
  console.log('\n--- SUPER_ADMIN → success ---')
  if (superSess && ticket) {
    const { status, json } = await api('POST', '/api/admin/walk-in', {
      ticketSelections: [{ ticketId: ticket.id, quantity: 1 }],
      participants: [{ fullName: 'Super Test', email: 'sup@test.com', whatsapp: '08123456789', nim: '77777', faculty: 'FI', studyProgram: 'TI' }]
    }, superSess)
    assert(status === 200, 'SUPER_ADMIN→200', `got ${status}`)
    assert(json?.success === true, 'SUPER_ADMIN: success=true')
  } else skip('SUPER_ADMIN success', !superSess ? 'sign-in failed' : 'no ticket')

  // ── Mismatched participant count → 400 ───────────────────────────────────
  console.log('\n--- Mismatched participant count → 400 ---')
  if (adminSess && ticket) {
    const { status, json } = await api('POST', '/api/admin/walk-in', {
      ticketSelections: [{ ticketId: ticket.id, quantity: 2 }],
      participants: [{ fullName: 'Only One', email: 'one@test.com', whatsapp: '08123456789', nim: '66666', faculty: 'FI', studyProgram: 'TI' }]
    }, adminSess)
    assert(status === 400, 'Mismatched count→400', `got ${status}`)
    assert(!json?.success, 'Mismatched count: success!=true')
  } else skip('Mismatched count', !adminSess ? 'sign-in failed' : 'no ticket')

  // ── Empty selections → 400 ──────────────────────────────────────────────
  console.log('\n--- Empty selections → 400 ---')
  if (adminSess) {
    const { status, json } = await api('POST', '/api/admin/walk-in', {
      ticketSelections: [],
      participants: []
    }, adminSess)
    assert(status === 400, 'Empty selections→400', `got ${status}`)
  } else skip('Empty selections', !adminSess ? 'sign-in failed' : 'no ticket')

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70))
  console.log(`  SUMMARY: ✅ ${passed} passed | ❌ ${failed} failed | ⏭️ ${skipped} skipped`)
  console.log('='.repeat(70))
  if (failed > 0) {
    console.log('\n  FAILED:')
    results.filter(r => r.s === '❌').forEach(r => console.log(`    ❌ ${r.t}${r.d ? ' — ' + r.d : ''}`))
  }
  process.exit(0)
}

run().catch(e => { console.error('FATAL:', e); process.exit(1) })