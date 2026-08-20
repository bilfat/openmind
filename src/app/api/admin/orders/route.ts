import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError, parsePagination, parseSearch } from '@/lib/admin-read-auth'
import { withTimeoutGuard } from '@/lib/timeout'

/* eslint-disable @typescript-eslint/no-explicit-any */

const ORDER_STATUSES = ['DRAFT', 'PENDING_PAYMENT', 'WAITING_VERIFICATION', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'TICKET_ISSUED']
const TICKET_TYPES = ['FREE', 'PAID']
// DRAFT orders are hidden checkout sessions (no proof uploaded yet) and
// EXPIRED orders are stale drafts beyond the payment window — both are
// excluded from the default "all" listing & counters to keep the admin
// clean. Explicit status filters still work.
const HIDDEN_STATUSES = ['DRAFT', 'EXPIRED']

async function handleGetOrders(request: Request) {
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const url = new URL(request.url)
  const pagination = parsePagination(url.searchParams, 50)
  if ('error' in pagination) return jsonError(pagination.error ?? 'Parameter pagination tidak valid.', 400)
  const parsedSearch = parseSearch(url.searchParams)
  if ('error' in parsedSearch) return jsonError(parsedSearch.error ?? 'Parameter search tidak valid.', 400)

  const status = url.searchParams.get('status')?.trim() || ''
  const source = url.searchParams.get('source')?.trim().toUpperCase() || ''
  const ticketType = url.searchParams.get('ticket_type')?.trim().toUpperCase() || ''
  const faculty = url.searchParams.get('faculty')?.trim() || ''
  const statusList = status ? status.split(',').map((s) => s.trim()).filter(Boolean) : []
  if (statusList.some((s) => !ORDER_STATUSES.includes(s))) return jsonError('Status filter tidak valid.', 400)
  if (source && !['ONLINE', 'MANUAL'].includes(source)) return jsonError('Source filter tidak valid.', 400)
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
    // Counts and the issued-ticket query are independent, so they run in
    // parallel to keep the route fast (avoids serial round-trips that could
    // trip the read timeout guard).
    const buildCountQuery = (status?: string) => {
      let q = supabase.from('orders').select('id', { count: 'exact', head: true })
      if (status) q = q.eq('status', status)
      else q = q.not('status', 'in', `(${HIDDEN_STATUSES.join(',')})`)
      if (source) q = q.eq('source', source)
      if (matchingOrderIds) q = q.in('id', matchingOrderIds)
      return q
    }
    const [statusCountsResult, issuedSummaryResult] = await Promise.all([
      (async () => {
        const allCountResult = await buildCountQuery()
        if (allCountResult.error) throw new Error(allCountResult.error.message)
        const statusCounts: Record<string, number> = { ALL: allCountResult.count ?? 0 }
        const counts = await Promise.all(
          ORDER_STATUSES.map(async (s) => {
            const { count, error } = await buildCountQuery(s)
            if (error) throw new Error(error.message)
            return [s, count ?? 0] as const
          })
        )
        for (const [s, c] of counts) statusCounts[s] = c
        return statusCounts
      })(),
      (async () => {
        // Total issued tickets (not orders) for TICKET_ISSUED orders. An order
        // can contain multiple tickets (e.g. one buyer purchasing 2 tickets), so
        // the badge counts tickets, matching the "Terbit" figure on the tickets page.
        const issuedOrderIds: string[] = []
        const issuedPageSize = 1000
        let issuedFrom = 0
        while (true) {
          let q = supabase.from('orders').select('id').eq('status', 'TICKET_ISSUED')
          if (source) q = q.eq('source', source)
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
        return { issuedOrderIds, issuedTicketCount }
      })(),
    ])
    const statusCounts = statusCountsResult
    const issuedOrderIds = issuedSummaryResult.issuedOrderIds
    const issuedTicketCount = issuedSummaryResult.issuedTicketCount

    // View mode: when the "Tiket Diterbitkan" tab is selected, show one row per
    // issued ticket (per pax) instead of one row per order, so multi-pax orders
    // are listed individually and never merged into a single row.
    const isTicketIssuedView = statusList.length === 1 && statusList[0] === 'TICKET_ISSUED'
    if (isTicketIssuedView) {
      let ticketRows: any[] = []
      let ticketTotal = 0
      if (issuedOrderIds.length) {
        const result = await supabase
          .from('issued_tickets')
          .select('id, ticket_code, order_id, status, issued_at, orders(order_code, source, total_amount, created_by, created_at), participants(full_name, nim, faculty, study_program, email, whatsapp), ticket_types(name, code, ticket_type)', { count: 'exact' })
          .in('order_id', issuedOrderIds)
          .neq('status', 'CANCELLED')
          .order('issued_at', { ascending: false })
          .order('id', { ascending: false })
          .range(pagination.offset, pagination.offset + pagination.limit - 1)
        if (result.error) throw new Error(result.error.message)
        ticketRows = result.data ?? []
        ticketTotal = result.count ?? 0
      }

      const pageOrderIds = [...new Set(ticketRows.map((t: any) => t.order_id))] as string[]
      let ticketOperatorNames: Record<string, { full_name: string; role: string }> = {}
      let ticketEmailJobCounts: Record<string, number> = {}
      if (pageOrderIds.length) {
        const creatorIds = [...new Set(ticketRows.map((t: any) => t.orders?.created_by).filter(Boolean))] as string[]
        const [profilesResult, emailResult] = await Promise.all([
          creatorIds.length
            ? supabase.from('profiles').select('id, full_name, role').in('id', creatorIds)
            : Promise.resolve({ data: [], error: null }),
          supabase.from('email_jobs').select('id, order_id').eq('job_type', 'TICKET_ISSUED').in('order_id', pageOrderIds),
        ])
        if (profilesResult.error) throw new Error(profilesResult.error.message)
        if (emailResult.error) throw new Error(emailResult.error.message)
        ticketOperatorNames = (profilesResult.data ?? []).reduce((acc: any, p: any) => { acc[p.id] = { full_name: p.full_name, role: p.role }; return acc }, {})
        ticketEmailJobCounts = (emailResult.data ?? []).reduce((acc: Record<string, number>, job: any) => { acc[job.order_id] = (acc[job.order_id] ?? 0) + 1; return acc }, {})
      }

      const items = ticketRows.map((t: any) => {
        const operator = ticketOperatorNames[t.orders?.created_by]
        return {
          id: t.id,
          order_id: t.order_id,
          order_code: t.orders?.order_code ?? '-',
          ticket_code: t.ticket_code,
          status: t.status,
          issued_at: t.issued_at,
          participant: t.participants ?? {},
          ticket_type: t.ticket_types ?? {},
          order: {
            source: t.orders?.source ?? 'ONLINE',
            total_amount: t.orders?.total_amount ?? 0,
            created_at: t.orders?.created_at ?? null,
            created_by_name: operator ? operator.full_name : null,
            created_by_role: operator ? operator.role : null,
            has_ticket_email_job: (ticketEmailJobCounts[t.order_id] ?? 0) > 0,
          },
        }
      })
      return NextResponse.json({
        success: true,
        items,
        pagination: { page: pagination.page, limit: pagination.limit, total: ticketTotal, totalPages: Math.ceil(ticketTotal / pagination.limit) },
        statusCounts,
        issuedTicketCount,
      })
    }

    let query = supabase
      .from('orders')
      .select('id, order_code, event_id, status, source, subtotal, discount_total, total_amount, currency, created_by, created_at, updated_at, events(id, name)', { count: 'exact' })
    if (statusList.length) query = query.in('status', statusList)
    else query = query.not('status', 'in', `(${HIDDEN_STATUSES.join(',')})`)
    if (source) query = query.eq('source', source)
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
    let operatorNames: Record<string, { full_name: string; role: string }> = {}
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

      // Resolve operator (admin/staff) names for walk-in / manual orders
      const creatorIds = [...new Set((data ?? []).map((o: any) => o.created_by).filter(Boolean))] as string[]
      if (creatorIds.length) {
        const profilesQuery = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', creatorIds)
        if (profilesQuery.error) throw new Error(profilesQuery.error.message)
        operatorNames = (profilesQuery.data ?? []).reduce((acc, p: any) => {
          acc[p.id] = { full_name: p.full_name, role: p.role }
          return acc
        }, {} as Record<string, { full_name: string; role: string }>)
      }

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
      const operator = operatorNames[order.created_by]
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
        created_by: order.created_by ?? null,
        created_by_name: operator ? operator.full_name : null,
        created_by_role: operator ? operator.role : null,
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

