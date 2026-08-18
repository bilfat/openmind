import 'server-only'
import { formatEventDate, formatEventTimeRange } from '@/lib/event-utils'

export type EmailJob = {
  id: string
  job_type: 'PAYMENT_APPROVED' | 'PAYMENT_REJECTED' | 'TICKET_ISSUED' | 'BROADCAST'
  recipient_email: string
  recipient_name: string
  subject: string
  payload: Record<string, unknown>
  order_id: string | null
  issued_ticket_id: string | null
}

export type EmailEventContext = {
  name?: string | null
  year?: string | null
  event_date?: string | null
  start_time?: string | null
  end_time?: string | null
  venue?: string | null
  tagline?: string | null
  whatsapp_group_url?: string | null
}

const escapeHtml = (value: unknown): string => {
  return String(value ?? '').replace(/[&<>"']/g, (char: string): string => {
    if (char === '&') return '&'
    if (char === '<') return '<'
    if (char === '>') return '>'
    if (char === '"') return '"'
    if (char === "'") return '\''
    return char
  })
}

const row = (label: string, value: unknown): string => `<tr><td style="padding:6px 12px 6px 0;color:#64748b">${escapeHtml(label)}</td><td style="padding:6px 0;font-weight:600">${escapeHtml(value)}</td></tr>`
const rowHtml = (label: string, htmlValue: string): string => `<tr><td style="padding:6px 12px 6px 0;color:#64748b">${escapeHtml(label)}</td><td style="padding:6px 0;font-weight:600">${htmlValue}</td></tr>`

function eventLabel(event?: EmailEventContext): string {
  if (event?.name) return event.year ? `${event.name} ${event.year}` : event.name
  return 'OPEN MIND 2026'
}

function eventDateLabel(event?: EmailEventContext): string | null {
  if (event?.event_date) return formatEventDate(event.event_date)
  return null
}

function eventTimeLabel(event?: EmailEventContext): string | null {
  if (event?.event_date) return formatEventTimeRange(event.start_time, event.end_time)
  return null
}

export function renderEmail(job: EmailJob, event?: EmailEventContext): { subject: string; htmlContent: string } {
  const p = job.payload ?? {}
  const footer = `${eventLabel(event)} — HIPMI PT Telkom University`
  if (job.job_type === 'TICKET_ISSUED') {
    const qrToken = p.qr_token ?? p.qrToken ?? ''
    const date = eventDateLabel(event) ?? p.event_date ?? p.eventDate ?? ''
    const time = eventTimeLabel(event)
    const venue = event?.venue || p.venue || ''
    const whatsappGroupUrl = event?.whatsapp_group_url
    const whatsappGroupRow = whatsappGroupUrl ? rowHtml('Grup WhatsApp', `<a href="${escapeHtml(whatsappGroupUrl)}" style="color:#16a34a" target="_blank">${escapeHtml(whatsappGroupUrl)}</a>`) : ''
    return {
      subject: job.subject || `Tiket ${eventLabel(event)} Anda`,
      htmlContent: layout('Tiket berhasil diterbitkan', footer, `<p>Halo ${escapeHtml(job.recipient_name)},</p><table>${row('Kode tiket', p.ticket_code ?? p.ticketCode)}${row('Order', p.order_code ?? p.orderCode)}${row('Tipe tiket', p.ticket_type ?? p.ticketType)}${row('Tanggal event', `${date}${time ? ` (${time})` : ''}`)}${row('Venue', venue)}${whatsappGroupRow}${row('QR URL', `https://openmind2026.id/ticket/${escapeHtml(qrToken)}`)}</table>`),
    }
  }
  if (job.job_type === 'PAYMENT_APPROVED') return { subject: job.subject || 'Pembayaran disetujui', htmlContent: layout('Pembayaran disetujui', footer, `<p>Halo ${escapeHtml(job.recipient_name)},</p><table>${row('Order', p.order_code ?? p.orderId)}${row('Total', p.total_amount ?? p.amount)}${row('Status pembayaran', p.payment_status ?? 'PAID')}${row('Status tiket', p.ticket_status ?? 'TICKET_ISSUED')}</table><p>Tiket akan dikirim melalui email setelah proses penerbitan selesai.</p>`) }
  if (job.job_type === 'PAYMENT_REJECTED') return { subject: job.subject || 'Pembayaran memerlukan perbaikan', htmlContent: layout('Pembayaran ditolak', footer, `<p>Halo ${escapeHtml(job.recipient_name)},</p><table>${row('Order', p.order_code ?? p.orderId)}${row('Alasan', p.reason ?? p.rejection_reason)}</table><p>Silakan unggah kembali bukti pembayaran yang valid melalui halaman pembayaran.</p>`) }
  throw new Error(`Unsupported email job type: ${job.job_type}`)
}

function layout(title: string, footer: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#0f172a"><h1>${escapeHtml(title)}</h1>${body}<p style="color:#64748b;font-size:12px">${escapeHtml(footer)}</p></div>`
}