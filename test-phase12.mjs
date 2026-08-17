import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const file = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, '')
  }
}

loadEnv()
const baseUrl = process.env.PHASE12_WORKER_URL ?? 'http://localhost:3000/api/jobs/email-worker'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY
const secret = process.env.EMAIL_WORKER_SECRET
assert(url && key && secret, 'Supabase and EMAIL_WORKER_SECRET environment variables are required')
const db = createClient(url, key, { auth: { persistSession: false } })

async function rpc(name, args) {
  const { data, error } = await db.rpc(name, args)
  if (error) throw error
  return data
}

const marker = `phase12-test-${crypto.randomUUID()}`
const { data: inserted, error: insertError } = await db.from('email_jobs').insert({
  job_type: 'PAYMENT_APPROVED', recipient_email: 'phase12-test@example.invalid', recipient_name: 'Phase 12 Test',
  subject: marker, payload: { order_code: marker }, priority: 'NORMAL', status: 'PENDING',
  scheduled_at: new Date().toISOString(), max_attempts: 3,
}).select('id').single()
assert.ifError(insertError)
assert(inserted?.id)

try {
  const unauthorized = await fetch(baseUrl, { method: 'POST' })
  assert.equal(unauthorized.status, 401)
  const invalid = await fetch(baseUrl, { method: 'POST', headers: { authorization: 'Bearer invalid-secret' } })
  assert.equal(invalid.status, 401)
  const health = await fetch(baseUrl)
  assert.equal(health.status, 200)

  const [first, second] = await Promise.all([
    rpc('claim_email_jobs', { p_batch_size: 1, p_lease_seconds: 900 }),
    rpc('claim_email_jobs', { p_batch_size: 1, p_lease_seconds: 900 }),
  ])
  const claimed = [...(first ?? []), ...(second ?? [])].filter((job) => job.id === inserted.id)
  assert.equal(claimed.length, 1, 'Concurrent claims must return a job at most once')
  assert.equal(typeof await rpc('recover_stale_email_jobs', { p_lease_seconds: 60 }), 'number')

  if (process.env.PHASE12_RUN_LIVE_BREVO === 'true') {
    assert(process.env.PHASE12_TEST_RECIPIENT_EMAIL, 'PHASE12_TEST_RECIPIENT_EMAIL is required')
    const { error } = await db.from('email_jobs').update({ recipient_email: process.env.PHASE12_TEST_RECIPIENT_EMAIL, status: 'PENDING', scheduled_at: new Date().toISOString(), processing_started_at: null }).eq('id', inserted.id)
    assert.ifError(error)
    const response = await fetch(baseUrl, { method: 'POST', headers: { authorization: `Bearer ${secret}` } })
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.success, true)
    assert(body.counts.sent >= 1)
  }
  console.log('Phase 12 acceptance checks passed')
} finally {
  await db.from('email_jobs').delete().eq('id', inserted.id)
}
