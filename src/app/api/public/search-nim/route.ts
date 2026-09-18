import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function mapPaymentStatus(orderStatus: string): 'approved' | 'pending' | 'rejected' {
  switch (orderStatus) {
    case 'TICKET_ISSUED':
    case 'APPROVED':
      return 'approved'
    case 'CANCELLED':
    case 'REJECTED':
    case 'EXPIRED':
      return 'rejected'
    default:
      return 'pending'
  }
}

// Status pesanan yang dianggap aktif & valid untuk ditampilkan
const VALID_ORDER_STATUSES = ['TICKET_ISSUED', 'APPROVED', 'WAITING_VERIFICATION']

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawNim = searchParams.get('nim')

    if (!rawNim) {
      return NextResponse.json(
        { success: false, message: 'NIM harus diisi.' },
        { status: 400 }
      )
    }

    const nim = rawNim.trim()
    if (!nim || nim.length < 3) {
      return NextResponse.json(
        { success: false, message: 'Format NIM tidak valid. Masukkan minimal 3 karakter.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 1. Fetch active event (for group link and event context)
    const { data: activeEvent } = await supabase
      .from('events')
      .select('id, name, whatsapp_group_url')
      .eq('status', 'ACTIVE')
      .maybeSingle()

    // 2. Query participants matching NIM (case-insensitive)
    let participantQuery = supabase
      .from('participants')
      .select('id, full_name, nim, email, faculty, study_program, event_id, created_at')
      .ilike('nim', nim)

    if (activeEvent?.id) {
      // Prioritize active event if available
      participantQuery = participantQuery.eq('event_id', activeEvent.id)
    }

    const { data: participants, error: pError } = await participantQuery
      .order('created_at', { ascending: false })

    if (pError) {
      console.error('[NIM_SEARCH] Participant query error:', pError.message)
      throw pError
    }

    // If not found in active event, check all events as fallback
    let matchedParticipants = participants || []
    if (matchedParticipants.length === 0 && activeEvent?.id) {
      const { data: fallbackParticipants } = await supabase
        .from('participants')
        .select('id, full_name, nim, email, faculty, study_program, event_id, created_at')
        .ilike('nim', nim)
        .order('created_at', { ascending: false })

      if (fallbackParticipants && fallbackParticipants.length > 0) {
        matchedParticipants = fallbackParticipants
      }
    }

    if (!matchedParticipants || matchedParticipants.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: `NIM "${nim}" tidak ditemukan dalam data pendaftaran. Pastikan Anda sudah mendaftar tiket.`,
        },
        { status: 404 }
      )
    }

    const participantIds = matchedParticipants.map((p) => p.id)

    // 3. Find order items linked to these participants
    const { data: rawItems, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        id,
        order_id,
        participant_id,
        ticket_type_id,
        ticket_types (id, name, ticket_type),
        issued_tickets (id, ticket_code, qr_token, status, issued_at),
        orders (id, order_code, status, total_amount, created_at, event_id)
      `)
      .in('participant_id', participantIds)
      .order('created_at', { ascending: false })

    if (itemsError) {
      console.error('[NIM_SEARCH] Order items query error:', itemsError.message)
      throw itemsError
    }

    const orderItems = rawItems || []

    if (orderItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Data peserta ditemukan, tetapi belum terhubung dengan pesanan tiket.`,
        },
        { status: 404 }
      )
    }

    // 4. Pisahkan antara pesanan aktif vs tidak aktif (EXPIRED, CANCELLED, REJECTED, DRAFT)
    const activeItems = orderItems.filter((item: any) => {
      const order = Array.isArray(item.orders) ? item.orders[0] : item.orders
      if (!order) return false
      
      // Hanya izinkan status pesanan yang aktif / valid
      if (!VALID_ORDER_STATUSES.includes(order.status)) return false

      // Jika tiket sudah diterbitkan, pastikan statusnya bukan CANCELLED / EXPIRED
      const issuedTicket = Array.isArray(item.issued_tickets) ? item.issued_tickets[0] : item.issued_tickets
      if (issuedTicket && ['CANCELLED', 'EXPIRED'].includes(issuedTicket.status)) {
        return false
      }

      return true
    })

    // Jika seluruh pesanan yang pernah dibuat sudah kadaluarsa/dibatalkan
    if (activeItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Tiket untuk NIM "${nim}" sebelumnya telah kadaluarsa atau dibatalkan. Silakan melakukan pemesanan tiket baru.`,
        },
        { status: 404 }
      )
    }

    // 5. Transform and format active results
    const results = activeItems
      .map((item: any) => {
        const order = Array.isArray(item.orders) ? item.orders[0] : item.orders
        const participant = matchedParticipants.find((p) => p.id === item.participant_id)
        const ticketType = Array.isArray(item.ticket_types) ? item.ticket_types[0] : item.ticket_types
        const issuedTicket = Array.isArray(item.issued_tickets) ? item.issued_tickets[0] : item.issued_tickets

        if (!order || !participant) return null

        const paymentStatus = mapPaymentStatus(order.status)
        const isApproved = ['TICKET_ISSUED', 'APPROVED'].includes(order.status)
        const token = issuedTicket?.qr_token || order.order_code

        return {
          orderId: order.id,
          orderCode: order.order_code,
          customerName: participant.full_name,
          nim: participant.nim,
          faculty: participant.faculty || null,
          studyProgram: participant.study_program || null,
          ticketName: ticketType?.name || 'Tiket Peserta',
          ticketCategory: ticketType?.ticket_type || 'STANDARD',
          orderStatus: order.status,
          paymentStatus,
          isApproved,
          ticketCode: issuedTicket?.ticket_code || null,
          qrToken: issuedTicket?.qr_token || null,
          ticketStatus: issuedTicket?.status || null,
          whatsappGroupUrl: activeEvent?.whatsapp_group_url || null,
          ticketUrl: `/ticket/${encodeURIComponent(token)}`,
          downloadPdfUrl: `/api/tickets/${encodeURIComponent(token)}/download`,
          createdAt: order.created_at,
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      success: true,
      data: results,
      activeEventGroupUrl: activeEvent?.whatsapp_group_url || null,
    })
  } catch (error: any) {
    console.error('[NIM_SEARCH] Internal error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Terjadi kesalahan pada server saat mencari data NIM. Silakan coba lagi.',
      },
      { status: 500 }
    )
  }
}
