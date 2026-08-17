import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
assert(url && key, 'Supabase environment variables are required');
const db = createClient(url, key, { auth: { persistSession: false } });

const callIssue = async (orderId, forceFailure = false) => {
  const { data, error } = await db.rpc('issue_order_tickets_rpc', {
    p_order_id: orderId,
    p_require_approved: true,
    p_force_failure: forceFailure,
  });
  if (error) throw error;
  return data;
};

const orderId = process.env.PHASE11_APPROVED_ORDER_ID;
if (!orderId) {
  console.log('Set PHASE11_APPROVED_ORDER_ID to run against a seeded approved order.');
  process.exit(0);
}

const { data: before, error: beforeError } = await db
  .from('order_items')
  .select('id, order_id, participant_id, ticket_type_id, participants(full_name), ticket_types(name)')
  .eq('order_id', orderId);
assert.ifError(beforeError);
assert((before?.length ?? 0) > 0, 'Seeded order must have order items');

const first = await callIssue(orderId);
assert.equal(first.success, true);
assert.equal(first.totalCount, before.length);

const { data: issued, error: issuedError } = await db
  .from('issued_tickets')
  .select('id, ticket_code, qr_token, order_id, order_item_id, participant_id, ticket_type_id')
  .eq('order_id', orderId);
assert.ifError(issuedError);
assert.equal(issued.length, before.length);
assert.equal(new Set(issued.map((row) => row.ticket_code)).size, issued.length);
assert.equal(new Set(issued.map((row) => row.qr_token)).size, issued.length);

for (const item of before) {
  const ticket = issued.find((row) => row.order_item_id === item.id);
  assert(ticket, `Missing issued ticket for order item ${item.id}`);
  assert.equal(ticket.participant_id, item.participant_id);
  assert.equal(ticket.ticket_type_id, item.ticket_type_id);
  assert.match(ticket.qr_token, /^[a-f0-9]{64}$/);
}

const { data: jobs, error: jobsError } = await db
  .from('email_jobs')
  .select('id, issued_ticket_id, status, job_type')
  .eq('order_id', orderId)
  .eq('job_type', 'TICKET_ISSUED');
assert.ifError(jobsError);
assert.equal(jobs.length, issued.length);
assert(jobs.every((job) => job.status === 'PENDING'));

const retry = await callIssue(orderId);
assert.equal(retry.success, true);
assert.equal(retry.issuedCount, 0);
assert.equal(retry.existingCount, issued.length);

const { count: jobCountAfterRetry } = await db
  .from('email_jobs')
  .select('*', { count: 'exact', head: true })
  .eq('order_id', orderId)
  .eq('job_type', 'TICKET_ISSUED');
assert.equal(jobCountAfterRetry, jobs.length);

const { data: rollbackOrder } = await db
  .from('orders')
  .select('id')
  .eq('status', 'APPROVED')
  .neq('id', orderId)
  .limit(1)
  .maybeSingle();
if (rollbackOrder) {
  await assert.rejects(() => callIssue(rollbackOrder.id, true));
  const { count } = await db.from('issued_tickets').select('*', { count: 'exact', head: true }).eq('order_id', rollbackOrder.id);
  assert.equal(count, 0);
}

console.log('Phase 11 acceptance checks passed for', orderId);
