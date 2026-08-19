import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError, parsePagination, parseSearch } from '@/lib/admin-read-auth'
import { withTimeoutGuard } from '@/lib/timeout'

/* eslint-disable @typescript-eslint/no-explicit-any */

const ORDER_STATUSES = ['DRAFT', 'PENDING_PAYMENT', 'WAITING_VERIFICATION', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'TICKET_ISSUED']
const TICKET_TYPES = ['FREE', 'PAID']

async function handleGetOrders(request: Request) {
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const url = new URL(request.url)
  const pagination = parsePagination(url.searchParams, 50)
  if ('error' in pagination) return jsonError(pagination.error ?? 'Parameter pagination tidak valid.', 400)
  const parsedSearch = parseSearch(url.searchParams)
  if ('error' in parsedSearch) return jsonError(parsedSearch.error ?? 'Parameter search tidak valid.', 400)

  const status = url.searchParams.get('status')?.trim() || ''
  const ticketType = url.searchParams.get('ticket_type')?.trim().toUpperCase() || ''
  const faculty = url.searchParams.get('faculty')?.trim() || ''
  if (status && !ORDER_STATUSES.includes(status)) return jsonError('Status filter tidak valid.', 400)
  if (ticketType && !TICKET_TYPES.includes(ticketType)) return jsonError('Ticket type filter tidak valid.', 400)
  if (faculty.length > 100) return jsonError('Faculty filter maksimal 100 karakter.', 400)

  try {
    const { supabase } = auth
    let matchingOrderIds: string[] | null = null

    if (parsedSearch.search || faculty || ticketType) {
      const candidateIds = new Set<string>()
      if (parsedSearch.search) {
        const exactId = /^[0-9a-f-]{36}$/i.test(parsedSearch.search) ? parsedSearch.search : null
        let orderSearchQuery = supabase.from('orders').select('id')
        orderSearchQuery = exactId
          ? orderSearchQuery.or(`order_code.ilike.%${parsedSearch.search}%,id.eq.${exactId}`)
          : orderSearchQuery.ilike('order_code', `%${parsedSearch.search}%`)
        const orderQuery = await orderSearchQuery.limit(1000)
        if (orderQuery.error) throw new Error(orderQuery.error.message)
        for (const row of orderQuery.data ?? []) candidateIds.add(row.id)

        const participantQuery = await supabase
          .from('participants')
          .select('id')
          .or(`full_name.ilike.%${parsedSearch.search}%,nim.ilike.%${parsedSearch.search}%,email.ilike.%${parsedSearch.search}%`)
          .limit(1000)
        if (participantQuery.error) throw new Error(participantQuery.error.message)
        const participantIds = (participantQuery.data ?? []).map((row) => row.id)
        if (participantIds.length) {
          const itemQuery = await supabase.from('order_items').select('order_id').in('participant_id', participantIds)
          if (itemQuery.error) throw new Error(itemQuery.error.message)
          for (const row of itemQuery.data ?? []) candidateIds.add(row.order_id)
        }
      }
      if (faculty) {
        const participantQuery = await supabase.from('participants').select('id').ilike('faculty', `%${faculty}%`).limit(1000)
        if (participantQuery.error) throw new Error(participantQuery.error.message)
        const ids = (participantQuery.data ?? []).map((row) => row.id)
        if (ids.length) {
          const itemQuery = await supabase.from('order_items').select('order_id').in('participant_id', ids)
          if (itemQuery.error) throw new Error(itemQuery.error.message)
          for (const row of itemQuery.data ?? []) candidateIds.add(row.order_id)
        }
      }
      if (ticketType) {
        const ticketQuery = await supabase.from('ticket_types').select('id').eq('ticket_type', ticketType)
        if (ticketQuery.error) throw new Error(ticketQuery.error.message)
        const ticketIds = (ticketQuery.data ?? []).map((row) => row.id)
        if (ticketIds.length) {
          const itemQuery = await supabase.from('order_items').select('order_id').in('ticket_type_id', ticketIds)
          if (itemQuery.error) throw new Error(itemQuery.error.message)
          for (const row of itemQuery.data ?? []) candidateIds.add(row.order_id)
        }
      }
      matchingOrderIds = [...candidateIds]
      if (!matchingOrderIds.length) {
        return NextResponse.json({
          success: true,
          items: [],
          pagination: { page: pagination.page, limit: pagination.limit, total: 0, totalPages: 0 },
          statusCounts: { ALL: 0, ...Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) },
          issuedTicketCount: 0,
        })
      }
    }

    // Server-side totals so tab badges stay accurate even when the order count
    // exceeds the page limit (previously tab counts were derived from the
    // loaded page only, so they became partial once orders passed the limit).
    const buildCountQuery = (status?: string) => {
      let q = supabase.from('orders').select('id', { count: 'exact', head: true })
      if (status) q = q.eq('status', status)
      if (matchingOrderIds) q = q.in('id', matchingOrderIds)
      return q
    }
    const allCountResult = await buildCountQuery()
    if (allCountResult.error) throw new Error(allCountResult.error.message)
    const statusCounts: Record<string, number> = { ALL: allCountResult.count ?? 0 }
    for (const s of ORDER_STATUSES) {
      const { count, error } = await buildCountQuery(s)
      if (error) throw new Error(error.message)
      statusCounts[s] = count ?? 0
    }

    // Total issued tickets (not orders) for TICKET_ISSUED orders. An order can
    // contain multiple tickets (e.g. one buyer purchasing 2 tickets), so the
    // badge counts tickets, matching the "Terbit" figure on the tickets page.
    const issuedOrderIds: string[] = []
    const issuedPageSize = 1000
    let issuedFrom = 0
    while (true) {
      let q = supabase.from('orders').select('id').eq('status', 'TICKET_ISSUED')
      if (matchingOrderIds) q = q.in('id', matchingOrderIds)
      const { data, error } = await q.range(issuedFrom, issuedFrom + issuedPageSize - 1)
      if (error) throw new Error(error.message)
      issuedOrderIds.push(...(data ?? []).map((row) => row.id))
      if ((data ?? []).length < issuedPageSize) break
      issuedFrom += issuedPageSize
    }
    let issuedTicketCount = 0
    if (issuedOrderIds.length) {
      const { count, error } = await supabase
        .from('issued_tickets')
        .select('id', { count: 'exact', head: true })
        .in('order_id', issuedOrderIds)
        .neq('status', 'CANCELLED')
      if (error) throw new Error(error.message)
      issuedTicketCount = count ?? 0
    }

    let query = supabase
      .from('orders')
      .select('id, order_code, event_id, status, source, subtotal, discount_total, total_amount, currency, created_at, updated_at, events(id, name)', { count: 'exact' })
    if (status) query = query.eq('status', status)
    if (matchingOrderIds) query = query.in('id', matchingOrderIds)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1)
    if (error) throw new Error(error.message)

    const orderIds = (data ?? []).map((row) => row.id)
    let summaries: Record<string, { participants: any[]; ticketTypes: string[] }> = {}
    let issuedCounts: Record<string, number> = {}
    let ticketEmailJobCounts: Record<string, number> = {}
    if (orderIds.length) {
      const itemsQuery = await supabase
        .from('order_items')
        .select('order_id, participants(id, full_name, email, nim, faculty, study_program), ticket_types(id, name, code, ticket_type)')
        .in('order_id', orderIds)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
      if (itemsQuery.error) throw new Error(itemsQuery.error.message)
      summaries = (itemsQuery.data ?? []).reduce((acc, item: any) => {
        const current = acc[item.order_id] ?? { participants: [], ticketTypes: [] }
        if (item.participants) current.participants.push(item.participants)
        if (item.ticket_types?.name && !current.ticketTypes.includes(item.ticket_types.name)) current.ticketTypes.push(item.ticket_types.name)
        acc[item.order_id] = current
        return acc
      }, {} as Record<string, { participants: any[]; ticketTypes: string[] }>)

      const [issuedQuery, emailQuery] = await Promise.all([
        supabase.from('issued_tickets').select('id, order_id').in('order_id', orderIds),
        supabase.from('email_jobs').select('id, order_id').eq('job_type', 'TICKET_ISSUED').in('order_id', orderIds),
      ])
      if (issuedQuery.error) throw new Error(issuedQuery.error.message)
      if (emailQuery.error) throw new Error(emailQuery.error.message)
      issuedCounts = (issuedQuery.data ?? []).reduce((acc: Record<string, number>, ticket: any) => {
        acc[ticket.order_id] = (acc[ticket.order_id] ?? 0) + 1
        return acc
      }, {})
      ticketEmailJobCounts = (emailQuery.data ?? []).reduce((acc: Record<string, number>, job: any) => {
        acc[job.order_id] = (acc[job.order_id] ?? 0) + 1
        return acc
      }, {})
    }

    const items = (data ?? []).map((order: any) => {
      const summary = summaries[order.id] ?? { participants: [], ticketTypes: [] }
      return {
        id: order.id,
        order_code: order.order_code,
        event: order.events,
        status: order.status,
        source: order.source,
        subtotal: order.subtotal,
        discount_total: order.discount_total,
        total_amount: order.total_amount,
        currency: order.currency,
        participant_count: summary.participants.length,
        participants: summary.participants,
        ticket_types: summary.ticketTypes,
        issued_ticket_count: issuedCounts[order.id] ?? 0,
        has_ticket_email_job: (ticketEmailJobCounts[order.id] ?? 0) > 0,
        created_at: order.created_at,
        updated_at: order.updated_at,
      }
    })
    const total = count ?? 0
    return NextResponse.json({
      success: true,
      items,
      pagination: { page: pagination.page, limit: pagination.limit, total, totalPages: Math.ceil(total / pagination.limit) },
      statusCounts,
      issuedTicketCount,
    })
  } catch (error) {
    console.error('Admin orders read error:', error)
    return jsonError('Gagal mengambil data pesanan.', 500)
  }
}

export const GET = withTimeoutGuard(handleGetOrders)

