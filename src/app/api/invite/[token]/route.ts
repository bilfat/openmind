import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = createAdminClient()
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token undangan wajib diisi.' },
        { status: 400 }
      )
    }

    // 1. Fetch token details (Admin bypass RLS to read revoked/expired and private data)
    const { data: link, error: linkError } = await supabase
      .from('private_ticket_links')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (linkError) {
      throw new Error(`Failed to query token: ${linkError.message}`)
    }

    if (!link) {
      return NextResponse.json(
        { success: false, message: 'Tautan undangan tidak ditemukan.' },
        { status: 404 }
      )
    }

    // 2. Validate token status
    if (link.status === 'REVOKED') {
      return NextResponse.json(
        { success: false, message: 'Tautan undangan ini telah dinonaktifkan oleh panitia.' },
        { status: 400 }
      )
    }

    const now = new Date()

    if (link.status === 'EXPIRED' || (link.expires_at && new Date(link.expires_at) < now)) {
      return NextResponse.json(
        { success: false, message: 'Tautan undangan ini telah kedaluwarsa.' },
        { status: 400 }
      )
    }

    // 3. Fetch the associated ticket type
    const { data: ticket, error: ticketError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('id', link.ticket_type_id)
      .maybeSingle()

    if (ticketError) {
      throw new Error(`Failed to query ticket type: ${ticketError.message}`)
    }

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: 'Kategori tiket terkait tidak ditemukan atau telah dihapus.' },
        { status: 404 }
      )
    }

    // 4. Calculate dynamic remaining quota
    // Count active issued tickets
    const { count: issuedCount, error: issuedError } = await supabase
      .from('issued_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('ticket_type_id', ticket.id)
      .neq('status', 'CANCELLED')

    if (issuedError) {
      throw new Error(`Failed to calculate issued count: ${issuedError.message}`)
    }

    // Sum active reservations
    const { data: reservations, error: resError } = await supabase
      .from('ticket_reservations')
      .select('quantity')
      .eq('ticket_type_id', ticket.id)
      .eq('status', 'RESERVED')
      .gt('reserved_until', now.toISOString())

    if (resError) {
      throw new Error(`Failed to fetch reservations: ${resError.message}`)
    }

    const reservedCount = reservations.reduce((acc, curr) => acc + (curr.quantity || 0), 0)

    const totalUsed = (issuedCount || 0) + reservedCount
    const remainingQuota = Math.max(0, ticket.quota - totalUsed)

    // 5. Determine derived ticket status
    let derivedStatus = 'ACTIVE'
    
    if (ticket.status === 'ARCHIVED' || ticket.status === 'DRAFT' || ticket.status === 'PAUSED') {
      derivedStatus = ticket.status
    } else if (remainingQuota <= 0) {
      derivedStatus = 'SOLD_OUT'
    } else if (new Date(ticket.sales_end_at) < now) {
      derivedStatus = 'EXPIRED'
    }

    return NextResponse.json({
      success: true,
      derived_status: derivedStatus,
      data: {
        ...ticket,
        remaining_quota: remainingQuota,
        benefits: typeof ticket.benefits === 'string' ? JSON.parse(ticket.benefits) : ticket.benefits
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
