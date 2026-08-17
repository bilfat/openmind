import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError, parsePagination, parseSearch } from '@/lib/admin-read-auth'

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(request: Request) {
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)
  const url = new URL(request.url)
  const pagination = parsePagination(url.searchParams)
  if ('error' in pagination) return jsonError(pagination.error ?? 'Parameter pagination tidak valid.', 400)
  const parsedSearch = parseSearch(url.searchParams)
  if ('error' in parsedSearch) return jsonError(parsedSearch.error ?? 'Parameter search tidak valid.', 400)
  const faculty = url.searchParams.get('faculty')?.trim() || ''
  const ticketType = url.searchParams.get('ticket_type')?.trim().toUpperCase() || ''
  if (faculty.length > 100) return jsonError('Faculty filter maksimal 100 karakter.', 400)
  if (ticketType && !['FREE', 'PAID'].includes(ticketType)) return jsonError('Ticket type filter tidak valid.', 400)

  try {
    const { supabase } = auth
    let ticketTypeIds: string[] | null = null
    let filteredParticipantIds: string[] | null = null
    if (ticketType) {
      const ticketQuery = await supabase.from('ticket_types').select('id').eq('ticket_type', ticketType)
      if (ticketQuery.error) throw new Error(ticketQuery.error.message)
      ticketTypeIds = (ticketQuery.data ?? []).map((ticket) => ticket.id)
      if (!ticketTypeIds.length) {
        return NextResponse.json({ success: true, items: [], pagination: { page: pagination.page, limit: pagination.limit, total: 0, totalPages: 0 } })
      }
      const allocationQuery = await supabase.from('order_items').select('participant_id').in('ticket_type_id', ticketTypeIds)
      if (allocationQuery.error) throw new Error(allocationQuery.error.message)
      filteredParticipantIds = [...new Set((allocationQuery.data ?? []).map((item) => item.participant_id))]
      if (!filteredParticipantIds.length) {
        return NextResponse.json({ success: true, items: [], pagination: { page: pagination.page, limit: pagination.limit, total: 0, totalPages: 0 } })
      }
    }

    let query = supabase.from('participants').select('id, event_id, full_name, email, whatsapp, nim, faculty, study_program, instagram_username, created_at, updated_at', { count: 'exact' })
    if (parsedSearch.search) query = query.or(`full_name.ilike.%${parsedSearch.search}%,nim.ilike.%${parsedSearch.search}%,email.ilike.%${parsedSearch.search}%`)
    if (faculty) query = query.ilike('faculty', `%${faculty}%`)
    if (filteredParticipantIds) query = query.in('id', filteredParticipantIds)
    const { data, count, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).range(pagination.offset, pagination.offset + pagination.limit - 1)
    if (error) throw new Error(error.message)

    const participants = data ?? []
    const participantIds = participants.map((participant) => participant.id)
    let itemRows: any[] = []
    if (participantIds.length) {
      const itemsQuery = await supabase.from('order_items').select('id, order_id, participant_id, ticket_type_id, orders(id, order_code, status), ticket_types(id, name, code, ticket_type), issued_tickets(id, ticket_code, status, issued_at)').in('participant_id', participantIds).order('created_at', { ascending: false })
      if (itemsQuery.error) throw new Error(itemsQuery.error.message)
      itemRows = itemsQuery.data ?? []
    }
    const rowsByParticipant = itemRows.reduce((acc: Record<string, any[]>, item: any) => { (acc[item.participant_id] ??= []).push(item); return acc }, {})
    const items = participants.map((participant: any) => {
      const allocations = (rowsByParticipant[participant.id] ?? []).filter((item: any) => !ticketType || item.ticket_types?.ticket_type === ticketType)
      return { ...participant, orders: allocations.map((item: any) => ({ order_item_id: item.id, order: item.orders, ticket_type: item.ticket_types, issued_ticket: item.issued_tickets })) }
    })
    const total = count ?? 0
    return NextResponse.json({ success: true, items, pagination: { page: pagination.page, limit: pagination.limit, total, totalPages: Math.ceil(total / pagination.limit) } })
  } catch (error) {
    console.error('Admin participants read error:', error)
    return jsonError('Gagal mengambil data peserta.', 500)
  }
}

