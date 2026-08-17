import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'
import { loadOrderPdfData, safeFilename, TICKET_PDF_MAX_TICKETS } from '@/lib/tickets/ticket-pdf-data'
import { renderTicketsPdf } from '@/lib/tickets/pdf-renderer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)
  const { id: orderId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return jsonError('ID order tidak valid.', 400)
  try {
    const result = await loadOrderPdfData(auth.supabase, orderId)
    if (!result) return jsonError('Order tidak ditemukan.', 404)
    if (!result.tickets.length) return jsonError('Order tidak memiliki issued ticket yang dapat diunduh.', 404)
    if (result.tickets.length > TICKET_PDF_MAX_TICKETS) return jsonError('Jumlah tiket melebihi batas unduhan.', 413)
    const body = await renderTicketsPdf(result.tickets)
    return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename=\"${safeFilename(result.orderCode + '-tickets', 'tickets')}\"`, 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' } })
  } catch (error) {
    console.error('Admin order tickets PDF error:', error instanceof Error ? error.message : 'unknown')
    return jsonError('Gagal membuat PDF tiket order.', 500)
  }
}


