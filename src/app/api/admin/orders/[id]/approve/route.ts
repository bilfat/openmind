import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { broadcastToAllAdmins } from '@/lib/notifications';
import { triggerEmailWorker } from '@/lib/tickets/trigger-email-worker';

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  const supabaseServer = await createClient();
  const reqHeaders = Object.fromEntries(req.headers.entries());
  console.log('Approve API Request Headers:', reqHeaders);
  
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

  if (authError || !user) {
    console.error('getUser error:', authError);
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
    // 3. Call the atomic PostgreSQL RPC using admin client (service_role privileges)
    // We pass user.id from the verified session as p_admin_id (not client request body)
    const supabaseAdmin = createAdminClient();
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('approve_order_payment_rpc', {
      p_order_id: orderId,
      p_admin_id: user.id
    });

    if (rpcError) {
      console.error('Approve order RPC error:', rpcError);
      return NextResponse.json({
        success: false,
        message: rpcError.message.includes('VALIDATION_ERROR') 
          ? rpcError.message.split('VALIDATION_ERROR:')[1]?.trim() 
          : 'Terjadi kesalahan saat menyetujui pesanan.'
      }, { status: 400 });
    }

    // Kick the existing email worker so PAYMENT_APPROVED + TICKET_ISSUED jobs are processed immediately
    void triggerEmailWorker(new URL(req.url).origin)

    // 4. Notification (FAIL-OPEN): ORDER_APPROVED — only after RPC success
    await broadcastToAllAdmins({
      type: 'ORDER_APPROVED',
      title: 'Pembayaran Disetujui',
      message: 'Pembayaran untuk sebuah pesanan telah disetujui.',
      link: '/admin/orders',
      metadata: {
        order_id: orderId,
        approved_by: user.id,
      },
      client: supabaseAdmin,
    });

    return NextResponse.json({
      success: true,
      message: rpcResult.message || 'Pembayaran berhasil disetujui.',
      orderId: rpcResult.orderId
    }, { status: 200 });

  } catch (error: any) {
    console.error('Approve API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan internal server.'
    }, { status: 500 });
  }
}
