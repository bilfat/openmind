import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { triggerEmailWorker } from '@/lib/tickets/trigger-email-worker'

const ParticipantSchema = z.object({
  fullName: z.string().min(3, 'Nama lengkap wajib diisi.'),
  email: z.string().email('Email tidak valid.'),
  whatsapp: z.string().min(9, 'Nomor WhatsApp tidak valid.'),
  nim: z.string().min(5, 'NIM tidak valid.'),
  faculty: z.string(),
  studyProgram: z.string().min(2, 'Program studi wajib diisi.'),
  instagram: z.string().optional(),
});

const CheckoutSchema = z.object({
  ticketSelections: z.array(z.object({
    ticketId: z.string().uuid('ID tiket tidak valid.'),
    quantity: z.number().int().min(1, 'Kuantitas minimal 1.'),
  })).min(1, 'Minimal satu jenis tiket harus dipilih.'),
  participants: z.array(ParticipantSchema),
  referralCode: z.string().optional(),
  inviteToken: z.string().nullable().optional(),
});


async function handler(req: Request) {
  const supabase = createAdminClient();
  try {
    const body = await req.json();
    const validation = CheckoutSchema.safeParse(body);

    if (!validation.success) {
      console.error('Checkout validation failed:', JSON.stringify({ body, errors: validation.error.flatten() }));
      return NextResponse.json({ success: false, message: 'Data yang dikirim tidak valid.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { ticketSelections, participants, referralCode, inviteToken } = validation.data;

    const totalParticipants = participants.length;
    const totalQuantity = ticketSelections.reduce((sum, item) => sum + item.quantity, 0);

    if (totalParticipants !== totalQuantity) {
      return NextResponse.json({ success: false, message: 'Jumlah partisipan tidak cocok dengan jumlah tiket.' }, { status: 400 });
    }

    const { data: activeEvent } = await supabase
      .from('events')
      .select('id')
      .eq('status', 'ACTIVE')
      .single();

    if (!activeEvent) {
      return NextResponse.json({ success: false, message: 'Saat ini tidak ada event yang aktif.' }, { status: 400 });
    }
    
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_new_order_rpc', {
        p_event_id: activeEvent.id,
        p_ticket_selections: ticketSelections,
        p_participants: participants,
        p_referral_code: referralCode,
        p_invite_token: inviteToken
    })

    if (rpcError) {
        // Translate Postgres error to user-friendly message
        if (rpcError.message.includes('VALIDATION_ERROR:')) {
            const splitMsg = rpcError.message.split('VALIDATION_ERROR:');
            return NextResponse.json({ success: false, message: splitMsg[1] ? splitMsg[1].trim() : rpcError.message }, { status: 400 });
        }
        if (rpcError.message.includes('VALIDATION_ERROR')) {
            return NextResponse.json({ success: false, message: "Satu atau lebih tiket tidak tersedia untuk dibeli." }, { status: 400 });
        }
        if (rpcError.message.includes('QUOTA_EXCEEDED') || rpcError.message.includes('Kuota tiket tidak mencukupi')) {
            return NextResponse.json({ success: false, message: "Kuota untuk salah satu tiket tidak mencukupi." }, { status: 400 });
        }
        throw new Error(`RPC Error: ${rpcError.message}`);
    }

    if (rpcResult.totalAmount <= 0) {
      const { error: issueError } = await supabase.rpc('issue_order_tickets_rpc', {
        p_order_id: rpcResult.orderId,
        p_require_approved: true
      });
      if (issueError) {
        console.error('Failed to auto-issue tickets for free order:', issueError);
      } else {
        // Kick the existing email worker so TICKET_ISSUED jobs are processed immediately
        void triggerEmailWorker(new URL(req.url).origin)
      }
    }

    return NextResponse.json({ 
        success: true, 
        message: 'Pesanan berhasil dibuat!', 
        orderId: rpcResult.orderId, 
        orderCode: rpcResult.orderCode,
        total_amount: rpcResult.totalAmount
    });

  } catch (error: any) {
    console.error('Checkout API Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Terjadi kesalahan internal server.' }, { status: 500 });
  }
}

export { handler as POST }
