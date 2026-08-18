import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadIssuedTicketPdfDataByToken, safeFilename } from '@/lib/tickets/ticket-pdf-data'
import { renderTicketsPdf } from '@/lib/tickets/pdf-renderer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token tiket tidak valid.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const ticket = await loadIssuedTicketPdfDataByToken(supabase, token)

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: 'Tiket tidak ditemukan atau tidak dapat diunduh.' },
        { status: 404 }
      )
    }

    const body = await renderTicketsPdf([ticket])

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename(`OPEN-MIND-2026-${ticket.ticketCode}`, 'e-ticket')}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('[GUEST_TICKET_PDF] Error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json(
      { success: false, message: 'Gagal membuat PDF tiket.' },
      { status: 500 }
    )
  }
}
