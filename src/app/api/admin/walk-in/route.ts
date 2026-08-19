import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'
import { broadcastToAllAdmins } from '@/lib/notifications'
import { z } from 'zod'
import { triggerEmailWorker } from '@/lib/tickets/trigger-email-worker'
import { APP_URL } from '@/lib/app-url'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Zod Schema (mirrors checkout patterns, no referral/invite) ──────────────

const ParticipantSchema = z.object({
  fullName: z.string().min(3, 'Nama lengkap wajib diisi.'),
  email: z.string().email('Email tidak valid.'),
  whatsapp: z.string().min(9, 'Nomor WhatsApp tidak valid.'),
  nim: z.string().min(5, 'NIM tidak valid.'),
  faculty: z.string(),
  studyProgram: z.string().min(2, 'Program studi wajib diisi.'),
  instagram: z.string().optional(),
})

const WalkInSchema = z.object({
  ticketSelections: z.array(z.object({
    ticketId: z.string().uuid('ID tiket tidak valid.'),
    quantity: z.number().int().min(1, 'Kuantitas minimal 1.'),
  })).min(1, 'Minimal satu jenis tiket harus dipilih.'),
  participants: z.array(ParticipantSchema),
  referralCode: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'QRIS']).optional().default('CASH'),
})

// ── POST Handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // 1. Auth gate: require active ADMIN or SUPER_ADMIN
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  try {
    const body = await req.json()
    const validation = WalkInSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Data yang dikirim tidak valid.', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { ticketSelections, participants, referralCode, paymentMethod } = validation.data

    // 2. Validate participant count matches total quantity (Model B)
    const totalQuantity = ticketSelections.reduce((sum, item) => sum + item.quantity, 0)
    if (participants.length !== totalQuantity) {
      return NextResponse.json(
        { success: false, message: 'Jumlah partisipan tidak cocok dengan jumlah tiket.' },
        { status: 400 }
      )
    }

    // 3. Resolve active event server-side
    const supabaseAdmin = createAdminClient()
    const { data: activeEvent, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('status', 'ACTIVE')
      .single()

    if (eventError || !activeEvent) {
      return jsonError('Saat ini tidak ada event yang aktif.', 400)
    }

    // 4. Call the atomic PostgreSQL RPC (user.id from verified session, NOT request body)
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('create_manual_order_rpc', {
      p_event_id: activeEvent.id,
      p_ticket_selections: ticketSelections,
      p_participants: participants,
      p_payment_method: paymentMethod,
      p_referral_code: referralCode?.trim() || null,
      p_admin_id: auth.userId,
      p_app_url: APP_URL,
    })

    if (rpcError) {
      // Map Postgres error prefixes to HTTP 400 user messages
      if (rpcError.message.includes('VALIDATION_ERROR:')) {
        const splitMsg = rpcError.message.split('VALIDATION_ERROR:')
        return jsonError(splitMsg[1] ? splitMsg[1].trim() : rpcError.message, 400)
      }
      if (rpcError.message.includes('FORBIDDEN')) {
        return jsonError(rpcError.message, 403)
      }
      if (rpcError.message.includes('Kuota tiket tidak mencukupi') || rpcError.message.includes('QUOTA_EXCEEDED')) {
        return jsonError('Kuota untuk salah satu tiket tidak mencukupi.', 400)
      }
      console.error('Walk-in RPC error:', rpcError)
      return jsonError('Terjadi kesalahan saat membuat pesanan walk-in.', 500)
    }

    // Kick the existing email worker so TICKET_ISSUED jobs are processed immediately
    void triggerEmailWorker(new URL(req.url).origin)

    // 5. Fetch issued tickets for the success screen (FAIL-OPEN: never fail the order here)
    let issuedTickets: Array<{ ticketCode: string; participantName: string }> = []
    try {
      const { data: issuedRows } = await supabaseAdmin
        .from('issued_tickets')
        .select('ticket_code, participants(full_name)')
        .eq('order_id', rpcResult.orderId)
        .order('issued_at', { ascending: true })

      issuedTickets = (issuedRows || []).map((row: any) => ({
        ticketCode: row.ticket_code,
        participantName: row.participants?.full_name || '',
      }))
    } catch (issuedError: any) {
      console.error('Walk-in issued tickets fetch failed (fail-open):', issuedError)
    }

    // 6. Notification (FAIL-OPEN): ORDER_NEW for all active admins — only after RPC success
    await broadcastToAllAdmins({
      type: 'ORDER_NEW',
      title: 'Pesanan Baru',
      message: `Pesanan baru ${rpcResult.orderCode} telah dibuat.`,
      link: '/admin/orders',
      metadata: {
        order_id: rpcResult.orderId,
        order_code: rpcResult.orderCode,
        created_by: auth.userId,
      },
      client: supabaseAdmin,
    })

    return NextResponse.json({
      success: true,
      message: rpcResult.message || 'Walk-in order created successfully.',
      orderId: rpcResult.orderId,
      orderCode: rpcResult.orderCode,
      totalAmount: rpcResult.totalAmount,
      issuance: rpcResult.issuance,
      issuedTickets,
    }, { status: 200 })

  } catch (error: any) {
    console.error('Walk-in API error:', error)
    return jsonError('Terjadi kesalahan internal server.', 500)
  }
}
