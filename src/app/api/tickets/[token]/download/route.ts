import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadOrderPdfDataByToken, safeFilename } from '@/lib/tickets/ticket-pdf-data'
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
    const result = await loadOrderPdfDataByToken(supabase, token)

    if (!result || !result.tickets.length) {
      return NextResponse.json(
        { success: false, message: 'Tiket tidak ditemukan atau tidak dapat diunduh.' },
        { status: 404 }
      )
    }

    const body = await renderTicketsPdf(result.tickets)

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename(`OPEN-MIND-2026-${result.orderCode}`, 'e-ticket')}"`,
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
