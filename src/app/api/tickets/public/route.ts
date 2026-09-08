import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PAYMENT_WINDOW_HOURS } from '@/lib/payment-window'
import { withTimeoutGuard } from '@/lib/timeout'

async function handleGetPublicTickets(request: Request) {
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

      // STEP B: Load related data in parallel
      const [orderItemsRes, paymentRes] = await Promise.all([
        adminSupabase
          .from('order_items')
          .select('id, ticket_type_id, participant_id, unit_price, line_total, ticket_types(name), participants(full_name)')
          .eq('order_id', order.id),
        adminSupabase
          .from('payments')
          .select('rejection_reason')
          .eq('order_id', order.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (orderItemsRes.error) throw orderItemsRes.error

      const orderItems = orderItemsRes.data || []
      const firstItem = orderItems[0]
      const participants = firstItem?.participants as any
      const customerName = (Array.isArray(participants) ? participants[0]?.full_name : participants?.full_name) || 'Peserta'
      const quantity = orderItems.length

      // Fetch ALL issued tickets for this order (multi-ticket support)
      const itemIds = orderItems.map((item) => item.id)
      const { data: issuedTickets } =
        itemIds.length > 0
          ? await adminSupabase
              .from('issued_tickets')
              .select('id, status, qr_token, order_item_id, ticket_type_id, participant_id')
              .in('order_item_id', itemIds)
          : { data: [] }

      const issuedIds = (issuedTickets || []).map((it) => it.id)

      // Build ticket list with participant and ticket type info
      const ticketsList = (issuedTickets || []).map((it) => {
        const item = orderItems.find((oi) => oi.id === it.order_item_id)
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
      const primaryTicket = issuedTickets?.find(
        (it) => it.qr_token && (it.status === 'ACTIVE' || it.status === 'CHECKED_IN')
      )
      const qrToken = primaryTicket?.qr_token || issuedTickets?.find((it) => it.qr_token)?.qr_token || null

      const { count: checkedInCount } =
        issuedIds.length > 0
          ? await adminSupabase
              .from('check_ins')
              .select('*', { count: 'exact', head: true })
              .in('issued_ticket_id', issuedIds)
          : { count: 0 }

      const payment = paymentRes.data

      // Map order status to paymentStatus for frontend
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
        },
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
      return NextResponse.json(
        {
          success: true,
          data: [], // No active event, return empty catalog
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
          },
        }
      )
    }

    const now = new Date().toISOString()

    // 2. Fetch public, active ticket types for the active event
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

    const ticketList = tickets || []
    const ticketIds = ticketList.map((t) => t.id)

    if (ticketIds.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: [],
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
          },
        }
      )
    }

    // 3. Batched queries for remaining quota calculation (replaces slow N+1 loops)
    const [issuedRes, pendingOrdersRes] = await Promise.all([
      catalogSupabase
        .from('issued_tickets')
        .select('ticket_type_id')
        .in('ticket_type_id', ticketIds)
        .neq('status', 'CANCELLED'),
      catalogSupabase
        .from('orders')
        .select('id')
        .in('status', ['DRAFT', 'PENDING_PAYMENT', 'WAITING_VERIFICATION']),
    ])

    if (issuedRes.error) {
      throw new Error(`Failed to calculate issued count: ${issuedRes.error.message}`)
    }
    if (pendingOrdersRes.error) {
      throw new Error(`Failed to fetch pending orders: ${pendingOrdersRes.error.message}`)
    }

    const pendingOrderIds = (pendingOrdersRes.data ?? []).map((o: { id: string }) => o.id)
    let pendingItemsData: { ticket_type_id: string }[] = []

    if (pendingOrderIds.length > 0) {
      const { data: pendingItems, error: pendCountErr } = await catalogSupabase
        .from('order_items')
        .select('ticket_type_id')
        .in('ticket_type_id', ticketIds)
        .in('order_id', pendingOrderIds)

      if (pendCountErr) {
        throw new Error(`Failed to calculate pending count: ${pendCountErr.message}`)
      }
      pendingItemsData = pendingItems ?? []
    }

    const issuedCounts: Record<string, number> = {}
    for (const item of issuedRes.data ?? []) {
      issuedCounts[item.ticket_type_id] = (issuedCounts[item.ticket_type_id] || 0) + 1
    }

    const pendingCounts: Record<string, number> = {}
    for (const item of pendingItemsData) {
      pendingCounts[item.ticket_type_id] = (pendingCounts[item.ticket_type_id] || 0) + 1
    }

    const processedTickets = ticketList.map((ticket) => {
      const issued = issuedCounts[ticket.id] || 0
      const pending = pendingCounts[ticket.id] || 0
      const totalUsed = issued + pending
      const remainingQuota = Math.max(0, ticket.quota - totalUsed)

      return {
        ...ticket,
        remaining_quota: remainingQuota,
        benefits: typeof ticket.benefits === 'string' ? JSON.parse(ticket.benefits) : ticket.benefits,
      }
    })

    return NextResponse.json(
      {
        success: true,
        data: processedTickets,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        },
      }
    )
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export const GET = withTimeoutGuard(handleGetPublicTickets, 12000)

