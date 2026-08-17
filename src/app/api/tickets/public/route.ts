import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Get the active event
    const { data: activeEvent, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (eventError || !activeEvent) {
      return NextResponse.json({
        success: true,
        data: [] // No active event, return empty catalog
      })
    }

    const now = new Date().toISOString()

    // 2. Fetch public, active ticket types for the active event
    // that are currently within their sales window
    const { data: tickets, error: ticketError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', activeEvent.id)
      .eq('status', 'ACTIVE')
      .eq('visibility', 'PUBLIC')
      .lte('sales_start_at', now)
      .gte('sales_end_at', now)

    if (ticketError) {
      throw new Error(`Failed to fetch ticket types: ${ticketError.message}`)
    }

    const processedTickets = []

    // 3. For each ticket type, calculate remaining quota dynamically
    for (const ticket of tickets) {
      // a. Count issued tickets (not cancelled)
      const { count: issuedCount, error: issuedError } = await supabase
        .from('issued_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('ticket_type_id', ticket.id)
        .neq('status', 'CANCELLED')

      if (issuedError) {
        throw new Error(`Failed to calculate issued count: ${issuedError.message}`)
      }

      // b. Sum active reservations
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

      // c. Calculate remaining quota
      const totalUsed = (issuedCount || 0) + reservedCount
      const remainingQuota = Math.max(0, ticket.quota - totalUsed)

      processedTickets.push({
        ...ticket,
        remaining_quota: remainingQuota,
        benefits: typeof ticket.benefits === 'string' ? JSON.parse(ticket.benefits) : ticket.benefits
      })
    }

    return NextResponse.json({
      success: true,
      data: processedTickets
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
