import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'
import { loadIssuedTicketPdfData, safeFilename } from '@/lib/tickets/ticket-pdf-data'
import { renderTicketsPdf } from '@/lib/tickets/pdf-renderer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)
  const { id: issuedTicketId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(issuedTicketId)) return jsonError('ID tiket tidak valid.', 400)
  try {
    const ticket = await loadIssuedTicketPdfData(auth.supabase, issuedTicketId)
    if (!ticket) return jsonError('Tiket tidak ditemukan atau tidak dapat diunduh.', 404)
    const body = await renderTicketsPdf([ticket])
    return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename=\"${safeFilename(ticket.ticketCode, 'ticket')}\"`, 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' } })
  } catch (error) {
    console.error('Admin individual ticket PDF error:', error instanceof Error ? error.message : 'unknown')
    return jsonError('Gagal membuat PDF tiket.', 500)
  }
}

