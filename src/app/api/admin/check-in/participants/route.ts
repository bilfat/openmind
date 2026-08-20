import { NextResponse } from 'next/server'
import { requireActiveOperator, jsonError, parsePagination } from '@/lib/admin-read-auth'
import { withTimeoutGuard } from '@/lib/timeout'

/* eslint-disable @typescript-eslint/no-explicit-any */

async function handleGetParticipants(request: Request) {
  const auth = await requireActiveOperator()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const url = new URL(request.url)
  const pagination = parsePagination(url.searchParams, 50)
  if ('error' in pagination) return jsonError(pagination.error ?? 'Parameter pagination tidak valid.', 400)

  const status = (url.searchParams.get('status') ?? 'ALL').trim().toUpperCase()
  const search = (url.searchParams.get('search') ?? '').trim().slice(0, 100)
  if (status && !['ALL', 'CHECKED_IN', 'NOT_PRESENT'].includes(status)) {
    return jsonError('Parameter status tidak valid.', 400)
  }

  try {
    const { supabase } = auth

    let query = supabase
      .from('issued_tickets')
      .select(
        `id, ticket_code, status, issued_at,
         participants(id, full_name, nim, faculty, email),
         orders(order_code),
         ticket_types(name),
         check_ins(id, checked_in_at, method, checked_in_by, profiles(full_name, role))`,
        { count: 'exact' }
      )

    if (status === 'CHECKED_IN') {
      query = query.eq('status', 'CHECKED_IN')
    } else if (status === 'NOT_PRESENT') {
      query = query.eq('status', 'ACTIVE')
    } else {
      query = query.in('status', ['ACTIVE', 'CHECKED_IN'])
    }

    if (search) {
      // Two-step search: find matching participant/order IDs first (cross-table
      // search is not supported by a single .or() filter), then filter parent table.
      const participantQuery = await supabase
        .from('participants')
        .select('id')
        .or(`full_name.ilike.*${search}*,nim.ilike.*${search}*,email.ilike.*${search}*`)
      const orderQuery = await supabase
        .from('orders')
        .select('id')
        .or(`order_code.ilike.*${search}*`)

      if (participantQuery.error || orderQuery.error) {
        throw new Error(participantQuery.error?.message || orderQuery.error?.message || 'Search query failed')
      }

      const participantIds = (participantQuery.data ?? []).map((p) => p.id)
      const orderIds = (orderQuery.data ?? []).map((o) => o.id)

      const clauses = [`ticket_code.ilike.*${search}*`]
      if (participantIds.length > 0) clauses.push(`participant_id.in.(${participantIds.join(',')})`)
      if (orderIds.length > 0) clauses.push(`order_id.in.(${orderIds.join(',')})`)
      query = query.or(clauses.join(','))
    }

    const { data, count, error } = await query
      .order('issued_at', { ascending: false })
      .order('id', { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1)

    if (error) throw new Error(error.message)

    const items = (data ?? []).map((ticket: any) => {
      const checkIns = Array.isArray(ticket.check_ins) ? ticket.check_ins : []
      return {
        id: ticket.id,
        ticketCode: ticket.ticket_code,
        status: ticket.status,
        issuedAt: ticket.issued_at,
        participant: ticket.participants ?? null,
        order: ticket.orders ?? null,
        ticketTypeName: ticket.ticket_types?.name ?? '-',
        checkIn: checkIns.length > 0 ? checkIns[0] : null,
        isCheckedIn: ticket.status === 'CHECKED_IN' || checkIns.length > 0,
      }
    })

    const total = count ?? 0
    return NextResponse.json({
      success: true,
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    })
  } catch (error) {
    console.error('Admin check-in participants read error:', error)
    return jsonError('Gagal mengambil data peserta.', 500)
  }
}

export const GET = withTimeoutGuard(handleGetParticipants)
