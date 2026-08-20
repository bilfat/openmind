import { NextResponse } from 'next/server'
import { requireActiveOperator, jsonError } from '@/lib/admin-read-auth'

/* eslint-disable @typescript-eslint/no-explicit-any */

// GET /api/admin/walk-in/ticket-types
// Lists ticket types eligible for Walk-In purchase from the SAME source of truth
// (public.ticket_types) that /api/admin/tickets manages. Unlike the management
// endpoint (SUPER_ADMIN only), this read endpoint is open to active ADMIN and
// SUPER_ADMIN, and only exposes tickets the create_manual_order_rpc will accept:
//   - belongs to the active event
//   - status = ACTIVE
//   - visibility != PRIVATE (private tickets require an invite token)
//   - now within sales window
//   - remaining quota > 0
export async function GET() {
  const auth = await requireActiveOperator()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const supabase = auth.supabase

  try {
    const { data: activeEvent, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (eventError || !activeEvent) {
      return NextResponse.json({ success: true, data: [] })
    }

    const now = new Date().toISOString()

    const { data: tickets, error: ticketError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', activeEvent.id)
      .eq('status', 'ACTIVE')
      .neq('visibility', 'PRIVATE')
      .lte('sales_start_at', now)
      .gte('sales_end_at', now)
      .order('created_at', { ascending: false })

    if (ticketError) {
      throw new Error(`Failed to fetch walk-in ticket types: ${ticketError.message}`)
    }

    const processedTickets = []

    for (const ticket of tickets) {
      const { count: issuedCount, error: issuedError } = await supabase
        .from('issued_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('ticket_type_id', ticket.id)
        .neq('status', 'CANCELLED')

      if (issuedError) {
        throw new Error(`Failed to calculate issued count: ${issuedError.message}`)
      }

      const { data: reservations, error: resError } = await supabase
        .from('ticket_reservations')
        .select('quantity')
        .eq('ticket_type_id', ticket.id)
        .eq('status', 'RESERVED')
        .gt('reserved_until', now)

      if (resError) {
        throw new Error(`Failed to fetch reservations: ${resError.message}`)
      }

      const reservedCount = reservations.reduce((acc, curr) => acc + (curr.quantity || 0), 0)
      const totalUsed = (issuedCount || 0) + reservedCount
      const remainingQuota = Math.max(0, ticket.quota - totalUsed)

      if (remainingQuota <= 0) {
        continue
      }

      processedTickets.push({
        ...ticket,
        issued: issuedCount || 0,
        reserved: reservedCount,
        remaining_quota: remainingQuota,
        benefits: typeof ticket.benefits === 'string' ? JSON.parse(ticket.benefits) : ticket.benefits,
      })
    }

    return NextResponse.json({ success: true, data: processedTickets })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}