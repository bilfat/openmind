import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PAYMENT_WINDOW_HOURS } from '@/lib/payment-window'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orderCode = searchParams.get('order_code')

    if (orderCode) {
      // Normalize: trim whitespace, keep case as-is (DB is case-sensitive)
      const normalizedCode = orderCode.trim()

      if (!normalizedCode) {
        return NextResponse.json(
          { success: false, message: 'Format Order ID tidak valid.' },
          { status: 400 }
        )
      }

      // Use admin client to bypass RLS (this is a server-side public API)
      const adminSupabase = createAdminClient()

      // STEP A: Find order by normalized order_code
      const { data: order, error: orderError } = await adminSupabase
        .from('orders')
        .select('*')
        .eq('order_code', normalizedCode)
        .maybeSingle()

      if (orderError) {
        console.error('[TICKET_LOOKUP] Order query error:', orderError.message)
        throw orderError
      }

      if (!order) {
        return NextResponse.json(
          { success: false, message: 'Pesanan tidak ditemukan.' },
          { status: 404 }
        )
      }

      // STEP B: Load related data (order_items, participants, tickets)
      // These are separate from the order lookup — order exists regardless of items/tickets
      const { data: orderItems, error: itemsError } = await adminSupabase
        .from('order_items')
        .select('id, ticket_type_id, participant_id, unit_price, line_total, ticket_types(name), participants(full_name)')
        .eq('order_id', order.id)

      if (itemsError) throw itemsError

      // Get participant info from order's primary_participant_id or first item
      const firstItem = orderItems?.[0]
      const participants = firstItem?.participants as any
      const customerName = (Array.isArray(participants) ? participants[0]?.full_name : participants?.full_name) || 'Peserta'
      const quantity = orderItems?.length || 0

      // Fetch ALL issued tickets for this order (multi-ticket support)
      const itemIds = orderItems?.map(item => item.id) || []
      const { data: issuedTickets } = await adminSupabase
        .from('issued_tickets')
        .select('id, status, qr_token, order_item_id, ticket_type_id, participant_id')
        .in('order_item_id', itemIds)

      const issuedIds = issuedTickets?.map(it => it.id) || []

      // Build ticket list with participant and ticket type info
      const ticketsList = (issuedTickets || []).map(it => {
        const item = orderItems?.find(oi => oi.id === it.order_item_id)
        const ticketTypes = item?.ticket_types as any
        const ticketName = (Array.isArray(ticketTypes) ? ticketTypes[0]?.name : ticketTypes?.name) || 'Tiket'
        return {
          issuedTicketId: it.id,
          qrToken: it.qr_token,
          ticketName,
          status: it.status,
        }
      })

      // Primary qrToken: first active/checked_in ticket
      const primaryTicket = issuedTickets?.find(it => it.qr_token && (it.status === 'ACTIVE' || it.status === 'CHECKED_IN'))
      const qrToken = primaryTicket?.qr_token || issuedTickets?.find(it => it.qr_token)?.qr_token || null

      const { count: checkedInCount } = await adminSupabase
        .from('check_ins')
        .select('*', { count: 'exact', head: true })
        .in('issued_ticket_id', issuedIds)

      // Fetch payment proof details (to get reject reason if any)
      const { data: payment } = await adminSupabase
        .from('payments')
        .select('rejection_reason')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Map order status to paymentStatus for frontend
      // Valid statuses: DRAFT, PENDING_PAYMENT, WAITING_VERIFICATION, APPROVED, REJECTED, CANCELLED, EXPIRED, TICKET_ISSUED
      let paymentStatus: string
      switch (order.status) {
        case 'TICKET_ISSUED':
        case 'APPROVED':
          paymentStatus = 'approved'
          break
        case 'CANCELLED':
        case 'REJECTED':
          paymentStatus = 'rejected'
          break
        default:
          paymentStatus = 'pending'
          break
      }

      return NextResponse.json({
        success: true,
        data: {
          id: order.id,
          orderId: order.order_code,
          orderCode: order.order_code,
          status: order.status,
          paymentDeadline: new Date(new Date(order.created_at).getTime() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000).toISOString(),
          qrToken,
          customerName,
          ticketName: (Array.isArray(firstItem?.ticket_types) ? (firstItem?.ticket_types as any)[0]?.name : (firstItem?.ticket_types as any)?.name) || 'Tiket',
          quantity,
          totalPrice: order.total_amount,
          paymentStatus,
          checkedIn: (checkedInCount || 0) > 0,
          rejectReason: payment?.rejection_reason || '',
          tickets: ticketsList,
        }
      })
    }

    // 1. Get the active event (catalog mode)
    const catalogSupabase = createAdminClient()
    const { data: activeEvent, error: eventError } = await catalogSupabase
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
    const { data: tickets, error: ticketError } = await catalogSupabase
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
      const { count: issuedCount, error: issuedError } = await catalogSupabase
        .from('issued_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('ticket_type_id', ticket.id)
        .neq('status', 'CANCELLED')

      if (issuedError) {
        throw new Error(`Failed to calculate issued count: ${issuedError.message}`)
      }

      // b. Count pending tickets = tiket dari pesanan yang belum di-approve
      // (WAITING_VERIFICATION) + pesanan baru yang belum upload bukti pembayaran
      // (DRAFT / PENDING_PAYMENT). Konsisten dengan admin dashboard & fitur tiket.
      const { data: pendingOrders, error: pendOrderErr } = await catalogSupabase
        .from('orders')
        .select('id')
        .in('status', ['DRAFT', 'PENDING_PAYMENT', 'WAITING_VERIFICATION'])

      if (pendOrderErr) {
        throw new Error(`Failed to fetch pending orders: ${pendOrderErr.message}`)
      }

      const pendingOrderIds = (pendingOrders ?? []).map((o: { id: string }) => o.id)
      let pendingCount = 0
      if (pendingOrderIds.length) {
        const { count, error: pendCountErr } = await catalogSupabase
          .from('order_items')
          .select('id', { count: 'exact', head: true })
          .eq('ticket_type_id', ticket.id)
          .in('order_id', pendingOrderIds)

        if (pendCountErr) {
          throw new Error(`Failed to calculate pending count: ${pendCountErr.message}`)
        }
        pendingCount = count ?? 0
      }

      // c. Calculate remaining quota
      const totalUsed = (issuedCount || 0) + pendingCount
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
