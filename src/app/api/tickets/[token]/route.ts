import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function mapPaymentStatus(orderStatus: string): string {
  switch (orderStatus) {
    case 'TICKET_ISSUED':
    case 'APPROVED':
      return 'approved'
    case 'CANCELLED':
    case 'REJECTED':
      return 'rejected'
    default:
      return 'pending'
  }
}

type IssuedRow = {
  id: string
  ticket_code: string
  qr_token: string
  status: string
  issued_at: string
}

type TicketTypeRow = {
  name: string
  ticket_type: string
}

type ParticipantRow = {
  full_name: string
  email: string
  whatsapp: string
  nim: string
  faculty: string
  study_program: string
  instagram_username: string | null
}

type ItemRow = {
  id: string
  ticket_type_id: string
  participant_id: string
  issued_tickets: IssuedRow | IssuedRow[] | null
  ticket_types: TicketTypeRow | TicketTypeRow[]
  participants: ParticipantRow | ParticipantRow[]
}

type TicketPayload = {
  orderId: string
  customerName: string
  email: string
  whatsapp: string
  nim: string
  faculty: string
  studyProgram: string
  instagram?: string
  ticketId: string
  ticketName: string
  ticketCategory: 'free' | 'paid'
  quantity: number
  totalPrice: number
  paymentStatus: string
  createdAt: string
  checkedIn: boolean
  checkedInAt?: string
  ticketCode: string
  qrToken: string
  issuedTicketStatus: string
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!token) {
      return NextResponse.json({ success: false, message: 'Tiket tidak ditemukan.' }, { status: 404 })
    }

    const supabase = createAdminClient()

    const { data: seed, error: seedError } = await supabase
      .from('issued_tickets')
      .select('order_id, status')
      .eq('qr_token', token)
      .maybeSingle()

    if (seedError) throw seedError
    if (!seed || !['ACTIVE', 'CHECKED_IN'].includes(seed.status)) {
      return NextResponse.json({ success: false, message: 'Tiket tidak ditemukan atau tidak aktif.' }, { status: 404 })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_code, status, total_amount, created_at')
      .eq('id', seed.order_id)
      .maybeSingle()
    if (orderError) throw orderError
    if (!order) {
      return NextResponse.json({ success: false, message: 'Pesanan tidak ditemukan.' }, { status: 404 })
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        id, ticket_type_id, participant_id,
        issued_tickets(id, ticket_code, qr_token, status, issued_at),
        ticket_types!inner(name, ticket_type),
        participants!inner(full_name, email, whatsapp, nim, faculty, study_program, instagram_username)
      `)
      .eq('order_id', order.id)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
    if (itemsError) throw itemsError

    const tickets: TicketPayload[] = []
    const issuedIds: string[] = []

    for (const rawItem of items ?? []) {
      const item = rawItem as ItemRow
      const issued = one(item.issued_tickets)
      if (!issued || !['ACTIVE', 'CHECKED_IN'].includes(issued.status)) continue
      const participant = one(item.participants)
      const ticketType = one(item.ticket_types)
      if (!participant || !ticketType) continue

      issuedIds.push(issued.id)
      tickets.push({
        orderId: order.order_code,
        customerName: participant.full_name,
        email: participant.email,
        whatsapp: participant.whatsapp,
        nim: participant.nim,
        faculty: participant.faculty,
        studyProgram: participant.study_program,
        instagram: participant.instagram_username ?? undefined,
        ticketId: item.ticket_type_id,
        ticketName: ticketType.name,
        ticketCategory: ticketType.ticket_type === 'FREE' ? 'free' : 'paid',
        quantity: 1,
        totalPrice: 0,
        paymentStatus: mapPaymentStatus(order.status),
        createdAt: issued.issued_at,
        checkedIn: false,
        ticketCode: issued.ticket_code,
        qrToken: issued.qr_token,
        issuedTicketStatus: issued.status,
      })
    }

    if (issuedIds.length) {
      const { data: checkIns } = await supabase
        .from('check_ins')
        .select('issued_ticket_id, checked_in_at')
        .in('issued_ticket_id', issuedIds)
      const checkInByTicket = new Map((checkIns ?? []).map((c) => [c.issued_ticket_id, c.checked_in_at]))
      for (let i = 0; i < tickets.length; i++) {
        const checkedInAt = checkInByTicket.get(issuedIds[i])
        tickets[i].checkedIn = Boolean(checkedInAt)
        tickets[i].checkedInAt = checkedInAt ?? undefined
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.order_code,
        paymentStatus: mapPaymentStatus(order.status),
        quantity: tickets.length,
        totalPrice: order.total_amount,
        createdAt: order.created_at,
        tickets,
      },
    })
  } catch (error) {
    console.error('Public ticket lookup failed:', error)
    return NextResponse.json({ success: false, message: 'Gagal memuat tiket.' }, { status: 500 })
  }
}