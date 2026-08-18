import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { broadcastToAllAdmins } from '@/lib/notifications';
import { z } from 'zod';
import { triggerEmailWorker } from '@/lib/tickets/trigger-email-worker';

/* eslint-disable @typescript-eslint/no-explicit-any */

const RejectSchema = z.object({
  rejectionReason: z.string().min(1, 'Alasan penolakan wajib diisi.')
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  // 1. Get authenticated user session on server side
  const supabaseServer = await createClient();
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({
      success: false,
      message: 'Unauthorized: Harap login terlebih dahulu.'
    }, { status: 401 });
  }

  // 2. Validate user is an ACTIVE Admin or Super Admin
  const { data: profile, error: profileError } = await supabaseServer
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.status !== 'ACTIVE' || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
    return NextResponse.json({
      success: false,
      message: 'Forbidden: Anda tidak memiliki akses untuk aksi ini.'
    }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validation = RejectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        message: validation.error.issues[0]?.message || 'Data tidak valid.'
      }, { status: 400 });
    }

    const { rejectionReason } = validation.data;

    // 3. Call the atomic PostgreSQL RPC using admin client (service_role privileges)
    // We pass user.id from the verified session as p_admin_id (not client request body)
    const supabaseAdmin = createAdminClient();
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('reject_order_payment_rpc', {
      p_order_id: orderId,
      p_admin_id: user.id,
      p_rejection_reason: rejectionReason
    });

    if (rpcError) {
      console.error('Reject order RPC error:', rpcError);
      return NextResponse.json({
        success: false,
        message: rpcError.message.includes('VALIDATION_ERROR') 
          ? rpcError.message.split('VALIDATION_ERROR:')[1]?.trim() 
          : 'Terjadi kesalahan saat menolak pesanan.'
      }, { status: 400 });
    }

    // Kick the existing email worker so PAYMENT_REJECTED jobs are processed immediately
    void triggerEmailWorker(new URL(req.url).origin)

    // 4. Notification (FAIL-OPEN): ORDER_REJECTED — only after RPC success
    await broadcastToAllAdmins({
      type: 'ORDER_REJECTED',
      title: 'Pembayaran Ditolak',
      message: 'Pembayaran untuk sebuah pesanan telah ditolak.',
      link: '/admin/orders',
      metadata: {
        order_id: orderId,
        rejected_by: user.id,
        reason: rejectionReason,
      },
      client: supabaseAdmin,
    });

    return NextResponse.json({
      success: true,
      message: rpcResult.message || 'Pembayaran berhasil ditolak.',
      orderId: rpcResult.orderId
    }, { status: 200 });

  } catch (error: any) {
    console.error('Reject API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan internal server.'
    }, { status: 500 });
  }
}
