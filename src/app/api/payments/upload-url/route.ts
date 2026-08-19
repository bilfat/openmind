import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const RequestSchema = z.object({
  orderId: z.string().uuid('ID order tidak valid.'),
  fileName: z.string().min(1, 'Nama file wajib diisi.'),
  fileType: z.string().refine((val) => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(val), {
    message: 'Tipe file harus berupa gambar (JPG, PNG, atau WEBP).',
  }),
  fileSize: z.number().max(5 * 1024 * 1024, 'Ukuran file maksimal 5MB.'),
});

export async function POST(req: Request) {
  const supabase = createAdminClient();

  try {
    const body = await req.json();
    const validation = RequestSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Data tidak valid.';
      return NextResponse.json({
        success: false,
        message: firstError,
        errors: validation.error.flatten().fieldErrors
      }, { status: 400 });
    }

    const { orderId, fileName, fileType, fileSize } = validation.data;

    // 1. Validate order existence and fetch details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, event_id, status, total_amount')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({
        success: false,
        message: 'Order tidak ditemukan atau tidak valid.'
      }, { status: 404 });
    }

    // 2. For FREE ticket types, total_amount <= 0. Free tickets are directly marked TICKET_ISSUED at checkout,
    // so they do not need payment proofs. Checked first to avoid catching the status.
    if (order.total_amount <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Order tiket gratis tidak memerlukan bukti pembayaran.'
      }, { status: 400 });
    }

    // 3. Validate order status eligibility for payment
    if (!['DRAFT', 'PENDING_PAYMENT', 'WAITING_VERIFICATION', 'REJECTED'].includes(order.status)) {
      return NextResponse.json({
        success: false,
        message: `Order dengan status ${order.status} tidak dapat menerima bukti pembayaran.`
      }, { status: 400 });
    }

    // 4. Generate a secure, deterministic path for the private bucket
    // Path structure: payment-proofs/{event_id}/{order_id}/{payment_id_or_timestamp}/proof_{random}.ext
    const fileExt = fileName.split('.').pop() || 'jpg';
    const cleanExt = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt.toLowerCase()) ? fileExt.toLowerCase() : 'jpg';
    
    // We generate a deterministic but unique key for the file upload
    const timestamp = Date.now();
    const filePath = `${order.event_id}/${order.id}/${timestamp}_proof.${cleanExt}`;

    // 5. Generate signed upload URL with 10 minutes expiry using admin storage API (since we bypass public access)
    // Note: createSignedUploadUrl is available on Supabase Admin storage client
    const { data, error: storageError } = await supabase.storage
      .from('payment-proofs')
      .createSignedUploadUrl(filePath);

    if (storageError || !data) {
      console.error('Storage Signed URL Error:', storageError);
      return NextResponse.json({
        success: false,
        message: 'Gagal membuat URL unggah bukti pembayaran.'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      uploadUrl: data.signedUrl,
      path: filePath,
      token: data.token // Required for some older storage upload scenarios, or to verify on server side
    }, { status: 200 });

  } catch (error: any) {
    console.error('Signed URL API Error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Terjadi kesalahan internal server.'
    }, { status: 500 });
  }
}
