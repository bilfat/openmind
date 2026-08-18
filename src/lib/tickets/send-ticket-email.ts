import type { SupabaseClient } from '@supabase/supabase-js'
import { writeAuditLog } from '@/lib/audit'

export const TICKET_EMAIL_SUBJECT = 'E-Ticket OPEN MIND 2026 Anda'
export const TICKET_EMAIL_ALLOWED_STATUSES = ['APPROVED', 'TICKET_ISSUED'] as const
export const CANONICAL_TICKET_URL = 'https://openmind2026.id/ticket'

export interface SendTicketEmailResult {
  success: boolean
  message: string
  orderId: string
  orderCode: string
  jobsCreated: number
  recipients: string[]
}

type OrderRow = { id: string; order_code: string; status: string }
type IssuedRow = { id: string; ticket_code: string; qr_token: string; status: string }
type ParticipantRow = { full_name: string | null; email: string | null }
type TicketTypeRow = { name: string | null }
type ItemRow = {
  id: string
  participants: ParticipantRow | ParticipantRow[] | null
  ticket_types: TicketTypeRow | TicketTypeRow[] | null
  issued_tickets: IssuedRow | IssuedRow[] | null
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

/**
 * Queues one NEW TICKET_ISSUED email_job per issued ticket of an order.
 *
 * Design notes:
 * - `issued_ticket_id` is intentionally left NULL on the new job rows. The DB has a
 *   unique partial index `email_jobs_one_ticket_job_per_ticket (issued_ticket_id)
 *   WHERE job_type = 'TICKET_ISSUED'`, which prevents a second job for the same
 *   ticket. The ticket identifier is tracked inside `payload.issued_ticket_id`
 *   instead, so the original issuance job history stays untouched.
 * - Jobs are PENDING and picked up by the existing email worker.
 */
export async function sendTicketEmailsForOrder(
  supabase: SupabaseClient,
  orderId: string,
  actorProfileId: string | null
): Promise<SendTicketEmailResult> {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_code, status')
    .eq('id', orderId)
    .maybeSingle<OrderRow>()
  if (orderError) throw orderError
  if (!order) {
    return { success: false, message: 'Order tidak ditemukan.', orderId, orderCode: '', jobsCreated: 0, recipients: [] }
  }
  if (!TICKET_EMAIL_ALLOWED_STATUSES.includes(order.status as (typeof TICKET_EMAIL_ALLOWED_STATUSES)[number])) {
    return { success: false, message: 'Tiket belum diterbitkan untuk pesanan ini.', orderId, orderCode: order.order_code, jobsCreated: 0, recipients: [] }
  }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('id, participants(full_name, email), ticket_types(name), issued_tickets(id, ticket_code, qr_token, status)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
  if (itemsError) throw itemsError

  const recipients: string[] = []
  const jobs: Record<string, unknown>[] = []
  for (const rawItem of items ?? []) {
    const item = rawItem as ItemRow
    const issued = one(item.issued_tickets)
    if (!issued || !['ACTIVE', 'CHECKED_IN'].includes(issued.status)) continue
    const participant = one(item.participants)
    if (!participant || !participant.email) continue
    const ticketType = one(item.ticket_types)
    if (!recipients.includes(participant.email)) recipients.push(participant.email)
    jobs.push({
      job_type: 'TICKET_ISSUED',
      recipient_email: participant.email,
      recipient_name: participant.full_name ?? '',
      subject: TICKET_EMAIL_SUBJECT,
      payload: {
        order_id: order.id,
        order_code: order.order_code,
        order_item_id: item.id,
        issued_ticket_id: issued.id,
        ticket_code: issued.ticket_code,
        qr_token: issued.qr_token,
        qr_url: `${CANONICAL_TICKET_URL}/${issued.qr_token}`,
        ticket_name: ticketType?.name ?? null,
        ticket_type: ticketType?.name ?? null,
        participant_name: participant.full_name ?? null,
        resend: true,
      },
      priority: 'HIGH',
      status: 'PENDING',
      order_id: order.id,
      issued_ticket_id: null,
    })
  }

  if (jobs.length === 0) {
    return { success: false, message: 'Order tidak memiliki tiket yang telah diterbitkan.', orderId: order.id, orderCode: order.order_code, jobsCreated: 0, recipients }
  }

  const { error: insertError } = await supabase.from('email_jobs').insert(jobs)
  if (insertError) throw insertError

  try {
    await writeAuditLog({
      actorProfileId,
      action: 'SEND_TICKET_EMAIL',
      entityType: 'orders',
      entityId: order.id,
      metadata: { order_id: order.id, order_code: order.order_code, jobs_created: jobs.length, recipients },
      client: supabase,
    })
  } catch (error) {
    console.error('Ticket email send audit log failed (fail-open):', error)
  }

  return { success: true, message: 'e-ticket berhasil dikirim ke email peserta.', orderId: order.id, orderCode: order.order_code, jobsCreated: jobs.length, recipients }
}