import 'server-only'

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

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char))
const row = (label: string, value: unknown) => `<tr><td style="padding:6px 12px 6px 0;color:#64748b">${escapeHtml(label)}</td><td style="padding:6px 0;font-weight:600">${escapeHtml(value)}</td></tr>`
const layout = (title: string, body: string) => `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#0f172a"><h1>${escapeHtml(title)}</h1>${body}<p style="color:#64748b;font-size:12px">OPEN MIND 2026</p></div>`

export function renderEmail(job: EmailJob): { subject: string; htmlContent: string } {
  const p = job.payload ?? {}
  if (job.job_type === 'TICKET_ISSUED') {
    const qrToken = p.qr_token ?? p.qrToken ?? ''
    return { subject: job.subject || 'Tiket OPEN MIND 2026 Anda', htmlContent: layout('Tiket berhasil diterbitkan', `<p>Halo ${escapeHtml(job.recipient_name)},</p><table>${row('Kode tiket', p.ticket_code ?? p.ticketCode)}${row('Order', p.order_code ?? p.orderCode)}${row('Tipe tiket', p.ticket_type ?? p.ticketType)}${row('Tanggal event', p.event_date ?? p.eventDate)}${row('Venue', p.venue)}${row('QR URL', `https://openmind2026.id/ticket/${escapeHtml(qrToken)}`)}</table>`) }
  }
  if (job.job_type === 'PAYMENT_APPROVED') return { subject: job.subject || 'Pembayaran disetujui', htmlContent: layout('Pembayaran disetujui', `<p>Halo ${escapeHtml(job.recipient_name)},</p><table>${row('Order', p.order_code ?? p.orderId)}${row('Total', p.total_amount ?? p.amount)}${row('Status pembayaran', p.payment_status ?? 'PAID')}${row('Status tiket', p.ticket_status ?? 'TICKET_ISSUED')}</table><p>Tiket akan dikirim melalui email setelah proses penerbitan selesai.</p>`) }
  if (job.job_type === 'PAYMENT_REJECTED') return { subject: job.subject || 'Pembayaran memerlukan perbaikan', htmlContent: layout('Pembayaran ditolak', `<p>Halo ${escapeHtml(job.recipient_name)},</p><table>${row('Order', p.order_code ?? p.orderId)}${row('Alasan', p.reason ?? p.rejection_reason)}</table><p>Silakan unggah kembali bukti pembayaran yang valid melalui halaman pembayaran.</p>`) }
  throw new Error(`Unsupported email job type: ${job.job_type}`)
}
