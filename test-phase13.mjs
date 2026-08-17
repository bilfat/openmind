import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
const envPath = path.resolve(process.cwd(), '.env.local')
const envText = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '')
for (const rawLine of envText.split(/\r?\n/)) {
  const line = rawLine.trimEnd()
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (!match || process.env[match[1]]) continue
  let value = match[2]
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
  process.env[match[1]] = value
}
const phase13Keys = ['PHASE13_NONADMIN_EMAIL', 'PHASE13_NONADMIN_PASSWORD', 'PHASE13_ADMIN_EMAIL', 'PHASE13_ADMIN_PASSWORD', 'PHASE13_SUPER_ADMIN_EMAIL', 'PHASE13_SUPER_ADMIN_PASSWORD']
for (const key of phase13Keys) {
  const value = process.env[key]
  const isPassword = key.endsWith('_PASSWORD')
  console.log(`[env] ${key}: ${value === undefined ? 'MISSING' : `FOUND present=${value.length > 0} length=${isPassword ? '[hidden]' : value.trim().length}`}`)
}
const base = process.env.PHASE13_BASE_URL ?? 'http://localhost:3000'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, secret = process.env.SUPABASE_SECRET_KEY
assert(url && secret)
const db = createClient(url, secret, { auth: { persistSession: false } })
async function req(pathname, cookies = '') { const headers = cookies ? { cookie: cookies } : {}; const response = await fetch(base + pathname, { headers }); let body = null; try { body = await response.json() } catch {} ; return { response, body } }
function status(result, expected, label) { assert.equal(result.response.status, expected, `${label}: ${result.response.status} ${JSON.stringify(result.body)}`) }
async function session(label, email, password) {
  if (!email || !password) {
    console.log(`${label} login FAIL (missing credential)`)
    return { cookies: null, error: 'missing credential' }
  }
  const normalizedEmail = email.trim()
  const normalizedPassword = password
  try {
    const c = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? secret, { auth: { persistSession: false } })
    const { data, error } = await c.auth.signInWithPassword({ email: normalizedEmail, password: normalizedPassword })
    if (error || !data.session) throw error ?? new Error('No session returned')

    const { createServerClient } = await import('@supabase/ssr')
    const cookieJar = new Map()
    const ssrClient = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? secret, {
      cookies: {
        getAll() {
          return [...cookieJar.entries()].map(([name, value]) => ({ name, value }))
        },
        setAll(cookies) {
          for (const { name, value } of cookies) cookieJar.set(name, value)
        },
      },
    })
    const { error: sessionError } = await ssrClient.auth.setSession(data.session)
    if (sessionError) throw sessionError
    const cookies = [...cookieJar.entries()].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('; ')
    if (!cookies) throw new Error('SSR client did not produce session cookies')
    console.log(`${label} login PASS`)
    return { cookies, error: null }
  } catch (error) {
    console.log(`${label} login FAIL (${error instanceof Error ? error.message : 'unknown error'})`)
    return { cookies: null, error: error instanceof Error ? error.message : String(error) }
  }
}
async function inspectFailedAccount(label, email, result) {
  if (!result.error || !email) return
  const normalizedEmail = email.trim().toLowerCase()
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) { console.log(`${label} service-role lookup: ERROR (${error.message})`); return }
  const user = data.users.find((candidate) => candidate.email?.trim().toLowerCase() === normalizedEmail)
  if (!user) { console.log(`${label} service-role lookup: user NOT FOUND`); return }
  const profile = await db.from('profiles').select('id, role, status').eq('id', user.id).maybeSingle()
  console.log(`${label} service-role lookup: user FOUND confirmed=${Boolean(user.email_confirmed_at)} profile_role=${profile.data?.role ?? 'MISSING'} profile_status=${profile.data?.status ?? 'MISSING'}`)
}
status(await req('/api/admin/orders'), 401, 'anonymous orders'); status(await req('/api/admin/participants'), 401, 'anonymous participants')
const nonAdminResult = await session('NONADMIN', process.env.PHASE13_NONADMIN_EMAIL, process.env.PHASE13_NONADMIN_PASSWORD)
const adminResult = await session('ADMIN', process.env.PHASE13_ADMIN_EMAIL, process.env.PHASE13_ADMIN_PASSWORD)
const superAdminResult = await session('SUPER_ADMIN', process.env.PHASE13_SUPER_ADMIN_EMAIL, process.env.PHASE13_SUPER_ADMIN_PASSWORD)
await inspectFailedAccount('NONADMIN', process.env.PHASE13_NONADMIN_EMAIL, nonAdminResult)
await inspectFailedAccount('ADMIN', process.env.PHASE13_ADMIN_EMAIL, adminResult)
await inspectFailedAccount('SUPER_ADMIN', process.env.PHASE13_SUPER_ADMIN_EMAIL, superAdminResult)
const nonAdmin = nonAdminResult.cookies
const admin = adminResult.cookies
const superAdmin = superAdminResult.cookies
if (!nonAdmin || !admin || !superAdmin) {
  console.log('Phase 13 authentication diagnosis stopped before API assertions.')
  process.exit(1)
}
status(await req('/api/admin/orders', nonAdmin), 403, 'non-admin orders'); status(await req('/api/admin/orders?limit=1', admin), 200, 'admin orders'); status(await req('/api/admin/orders?limit=1', superAdmin), 200, 'super-admin orders')
for (const q of ['page=0','limit=0','limit=101','page=x','limit=x']) status(await req('/api/admin/orders?' + q, admin), 400, q)
status(await req('/api/admin/orders?limit=100', admin), 200, 'max limit')
const { data: order } = await db.from('orders').select('id,order_code').order('created_at',{ascending:false}).limit(1).maybeSingle(); const { data: participant } = await db.from('participants').select('full_name,nim,email,faculty').order('created_at',{ascending:false}).limit(1).maybeSingle(); assert(order && participant)
for (const [label, value] of [['order_code',order.order_code],['uuid',order.id],['name',participant.full_name],['nim',participant.nim],['email',participant.email]]) { const r=await req('/api/admin/orders?search='+encodeURIComponent(value)+'&limit=100',admin); status(r,200,'search '+label); assert(r.body.items.some(x=>x.id===order.id),label) }
const {data: sf}=await db.from('orders').select('status').limit(1).maybeSingle(); if(sf?.status) status(await req('/api/admin/orders?status='+sf.status,admin),200,'status filter')
const {data: tf}=await db.from('ticket_types').select('ticket_type').limit(1).maybeSingle(); if(tf?.ticket_type) status(await req('/api/admin/orders?ticket_type='+tf.ticket_type,admin),200,'ticket filter'); if(participant.faculty) status(await req('/api/admin/orders?faculty='+encodeURIComponent(participant.faculty),admin),200,'faculty filter')
const all=await req('/api/admin/orders?limit=100',admin); status(all,200,'orders all'); assert.equal(new Set(all.body.items.map(x=>x.id)).size,all.body.items.length); assert.equal(all.body.pagination.totalPages,Math.ceil(all.body.pagination.total/100))
const detail=await req('/api/admin/orders/'+order.id,admin); status(detail,200,'detail'); assert(Array.isArray(detail.body.order_items)&&Array.isArray(detail.body.payments)&&Array.isArray(detail.body.email_jobs)); assert(!JSON.stringify(detail.body).includes('payment-proofs/')); assert(!JSON.stringify(detail.body).match(/[a-f0-9]{64}/)); status(await req('/api/admin/orders/not-a-uuid',admin),400,'invalid uuid'); status(await req('/api/admin/orders/00000000-0000-0000-0000-000000000000',admin),404,'missing order')
const before=await db.from('orders').select('status,updated_at').eq('id',order.id).single(); await req('/api/admin/orders/'+order.id,admin); const after=await db.from('orders').select('status,updated_at').eq('id',order.id).single(); assert.deepEqual(after.data,before.data)
const ps=await req('/api/admin/participants?limit=100',admin); status(ps,200,'participants'); assert.equal(ps.body.pagination.totalPages,Math.ceil(ps.body.pagination.total/100)); assert(ps.body.items.every(x=>Array.isArray(x.orders))); for(const [label,value] of [['name',participant.full_name],['nim',participant.nim],['email',participant.email]]) status(await req('/api/admin/participants?search='+encodeURIComponent(value),admin),200,'participants '+label); if(participant.faculty) status(await req('/api/admin/participants?faculty='+encodeURIComponent(participant.faculty),admin),200,'participants faculty')
if(tf?.ticket_type){const filtered=await req('/api/admin/participants?ticket_type='+tf.ticket_type+'&limit=1',admin); status(filtered,200,'participants ticket'); assert.equal(filtered.body.pagination.totalPages,Math.ceil(filtered.body.pagination.total/1)); assert(filtered.body.items.every(x=>x.orders.some(o=>o.ticket_type?.ticket_type===tf.ticket_type)))}
assert(!JSON.stringify(ps.body).toLowerCase().includes('check_in')); console.log('Phase 13 acceptance checks passed')
