import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const { data: issued, error } = await supabase
      .from('issued_tickets')
      .select(`id, ticket_code, qr_token, status, issued_at, order_id, order_item_id, ticket_type_id, participant_id, orders!inner(order_code, status), ticket_types!inner(name, ticket_type), participants!inner(full_name, email, whatsapp, nim, faculty, study_program, instagram_username)`)
      .eq('qr_token', token)
      .maybeSingle()

    if (error) throw error
    if (!issued || !['ACTIVE', 'CHECKED_IN'].includes(issued.status)) {
      return NextResponse.json({ success: false, message: 'Tiket tidak ditemukan atau tidak aktif.' }, { status: 404 })
    }

    const participant = Array.isArray(issued.participants) ? issued.participants[0] : issued.participants
    const ticketType = Array.isArray(issued.ticket_types) ? issued.ticket_types[0] : issued.ticket_types
    const order = Array.isArray(issued.orders) ? issued.orders[0] : issued.orders
    const { data: checkIn } = await supabase.from('check_ins').select('checked_in_at').eq('issued_ticket_id', issued.id).maybeSingle()

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.order_code,
        customerName: participant.full_name,
        email: participant.email,
        whatsapp: participant.whatsapp,
        nim: participant.nim,
        faculty: participant.faculty,
        studyProgram: participant.study_program,
        instagram: participant.instagram_username ?? undefined,
        ticketId: issued.ticket_type_id,
        ticketName: ticketType.name,
        ticketCategory: ticketType.ticket_type === 'FREE' ? 'free' : 'paid',
        quantity: 1,
        totalPrice: 0,
        paymentStatus: order.status === 'TICKET_ISSUED' ? 'approved' : 'pending',
        createdAt: issued.issued_at,
        checkedIn: Boolean(checkIn),
        checkedInAt: checkIn?.checked_in_at ?? undefined,
        ticketCode: issued.ticket_code,
        qrToken: issued.qr_token,
        issuedTicketStatus: issued.status,
      },
    })
  } catch (error) {
    console.error('Public ticket lookup failed:', error)
    return NextResponse.json({ success: false, message: 'Gagal memuat tiket.' }, { status: 500 })
  }
}
