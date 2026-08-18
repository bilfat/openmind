import QRCode from 'qrcode'
import type { SupabaseClient } from '@supabase/supabase-js'

export const TICKET_PDF_MAX_TICKETS = 50
export const TICKET_PDF_TIMEOUT_MS = 10_000
export const CANONICAL_TICKET_URL = 'https://openmind2026.id/ticket'

export type TicketPdfData = {
  id: string
  ticketCode: string
  qrToken: string
  status: 'ACTIVE' | 'CHECKED_IN'
  issuedAt: string
  orderCode: string
  eventName: string
  eventDate: string
  startTime: string
  endTime: string | null
  venue: string
  whatsappGroupUrl: string | null
  participantName: string
  participantNim: string | null
  participantFaculty: string | null
  participantStudyProgram: string | null
  ticketTypeName: string
}

type ParticipantRow = { full_name: string; nim: string | null; faculty: string | null; study_program: string | null }
type TicketTypeRow = { name: string }
type EventRow = { name: string; event_date: string; start_time: string; end_time: string | null; venue: string; whatsapp_group_url: string | null }
type OrderRow = { id?: string; order_code: string; event_id: string }
type IssuedRow = { id: string; ticket_code: string; qr_token: string; status: string; issued_at: string; order_id?: string }
type TicketQueryRow = IssuedRow & { orders: OrderRow | OrderRow[]; participants: ParticipantRow | ParticipantRow[]; ticket_types: TicketTypeRow | TicketTypeRow[] }
type OrderItemRow = { id: string; created_at: string; participant_id: string; ticket_type_id: string; participants: ParticipantRow | ParticipantRow[]; ticket_types: TicketTypeRow | TicketTypeRow[]; issued_tickets: IssuedRow | IssuedRow[] }
type PdfSupabase = SupabaseClient

export function canonicalTicketUrl(qrToken: string) {
  return `${CANONICAL_TICKET_URL}/${encodeURIComponent(qrToken)}`
}

export async function createTicketQrDataUrl(qrToken: string) {
  return QRCode.toDataURL(canonicalTicketUrl(qrToken), {
    width: 800,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#10213D', light: '#FFFFFF' },
  })
}

export function safeFilename(value: string, fallback: string) {
  const normalized = value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  return `${normalized || fallback}.pdf`
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

export async function loadIssuedTicketPdfData(supabase: PdfSupabase, ticketId: string): Promise<TicketPdfData | null> {
  const { data, error } = await supabase.from('issued_tickets').select(`id, ticket_code, qr_token, status, issued_at, order_id, order_item_id, orders!inner(order_code, event_id), participants!inner(full_name, nim, faculty, study_program), ticket_types!inner(name)`).eq('id', ticketId).maybeSingle<TicketQueryRow>()
  if (error) throw error
  if (!data || !['ACTIVE', 'CHECKED_IN'].includes(data.status)) return null
  const order = one(data.orders)
  const participant = one(data.participants)
  const ticketType = one(data.ticket_types)
  if (!order || !participant || !ticketType) return null
  const { data: event, error: eventError } = await supabase.from('events').select('name, event_date, start_time, end_time, venue, whatsapp_group_url').eq('id', order.event_id).maybeSingle<EventRow>()
  if (eventError) throw eventError
  if (!event) return null
  return toTicketPdfData(data, order, participant, ticketType, event)
}

export async function loadIssuedTicketPdfDataByToken(supabase: PdfSupabase, qrToken: string): Promise<TicketPdfData | null> {
  const { data, error } = await supabase
    .from('issued_tickets')
    .select(`id, ticket_code, qr_token, status, issued_at, order_id, order_item_id, orders!inner(order_code, event_id), participants!inner(full_name, nim, faculty, study_program), ticket_types!inner(name)`)
    .eq('qr_token', qrToken.toLowerCase())
    .maybeSingle<TicketQueryRow>()
  if (error) throw error
  if (!data || !['ACTIVE', 'CHECKED_IN'].includes(data.status)) return null
  const order = one(data.orders)
  const participant = one(data.participants)
  const ticketType = one(data.ticket_types)
  if (!order || !participant || !ticketType) return null
  const { data: event, error: eventError } = await supabase.from('events').select('name, event_date, start_time, end_time, venue, whatsapp_group_url').eq('id', order.event_id).maybeSingle<EventRow>()
  if (eventError) throw eventError
  if (!event) return null
  return toTicketPdfData(data, order, participant, ticketType, event)
}

export async function loadOrderPdfData(supabase: PdfSupabase, orderId: string): Promise<{ orderCode: string; tickets: TicketPdfData[] } | null> {
  const { data: order, error: orderError } = await supabase.from('orders').select('id, order_code, event_id').eq('id', orderId).maybeSingle<OrderRow>()
  if (orderError) throw orderError
  if (!order) return null
  const { data: event, error: eventError } = await supabase.from('events').select('name, event_date, start_time, end_time, venue, whatsapp_group_url').eq('id', order.event_id).maybeSingle<EventRow>()
  if (eventError) throw eventError
  if (!event) return { orderCode: order.order_code, tickets: [] }
  const { data: items, error: itemsError } = await supabase.from('order_items').select('id, created_at, participant_id, ticket_type_id, participants!inner(full_name, nim, faculty, study_program), ticket_types!inner(name), issued_tickets!inner(id, ticket_code, qr_token, status, issued_at)').eq('order_id', orderId).order('created_at', { ascending: true }).order('id', { ascending: true }).returns<OrderItemRow[]>()
  if (itemsError) throw itemsError
  const tickets = (items ?? []).flatMap((item) => {
    const issued = one(item.issued_tickets)
    if (!issued || !['ACTIVE', 'CHECKED_IN'].includes(issued.status)) return []
    const participant = one(item.participants)
    const ticketType = one(item.ticket_types)
    return participant && ticketType ? [toTicketPdfData({ ...issued, order_id: orderId }, order, participant, ticketType, event)] : []
  })
  return { orderCode: order.order_code, tickets }
}

function toTicketPdfData(issued: IssuedRow, order: OrderRow, participant: ParticipantRow, ticketType: TicketTypeRow, event: EventRow): TicketPdfData {
  return { id: issued.id, ticketCode: issued.ticket_code, qrToken: issued.qr_token, status: issued.status as 'ACTIVE' | 'CHECKED_IN', issuedAt: issued.issued_at, orderCode: order.order_code, eventName: event.name, eventDate: event.event_date, startTime: event.start_time, endTime: event.end_time, venue: event.venue, whatsappGroupUrl: event.whatsapp_group_url, participantName: participant.full_name, participantNim: participant.nim, participantFaculty: participant.faculty, participantStudyProgram: participant.study_program, ticketTypeName: ticketType.name }
}
