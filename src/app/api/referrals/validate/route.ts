import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { PostgrestError } from '@supabase/supabase-js';

const ReferralValidationSchema = z.object({
  referralCode: z.string().min(1, 'Kode referral tidak boleh kosong.'),
  eventId: z.string().uuid('ID Event tidak valid.'),
});

// Type definitions for referral data and response
type Referral = {
  id: string;
  code: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  event_id: string | null;
  start_at: string | null;
  end_at: string | null;
  usage_limit: number | null;
  times_used: number;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  max_discount: number | null;
};




export async function POST(req: Request) {
  const supabase = createAdminClient();

  try {
    const body = await req.json();
    const validation = ReferralValidationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, message: 'Data tidak valid.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { referralCode, eventId } = validation.data;

    console.log(`[Referral Validate] Validating code="${referralCode.toUpperCase()}" for event="${eventId}"`);

    // 1. Fetch Referral Code
    const { data: referral, error: fetchError } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('code', referralCode.toUpperCase())
      .single() as { data: Referral | null, error: PostgrestError | null };

    if (fetchError || !referral) {
      console.warn(`[Referral Validate] Code not found: "${referralCode.toUpperCase()}", fetchError: ${fetchError?.message} (code: ${fetchError?.code})`);
      return NextResponse.json({ success: false, message: 'Kode referral tidak ditemukan.' }, { status: 404 });
    }

    // 2. Check Referral Status
    if (referral.status !== 'ACTIVE') {
      console.warn(`[Referral Validate] Code "${referral.code}" is not ACTIVE (status=${referral.status})`);
      return NextResponse.json({ success: false, message: `Kode referral tidak aktif (status: ${referral.status}).` }, { status: 400 });
    }

    // 3. Check Event Applicability — allow referrals with null event_id to work for any event
    if (referral.event_id && referral.event_id !== eventId) {
      console.warn(`[Referral Validate] Code "${referral.code}" event mismatch: referral.event_id=${referral.event_id}, requested eventId=${eventId}`);
      return NextResponse.json({ success: false, message: 'Kode referral tidak berlaku untuk event ini.' }, { status: 400 });
    }

    // 4. Check Validity Dates
    const now = new Date();
    if (referral.start_at && new Date(referral.start_at) > now) {
      console.warn(`[Referral Validate] Code "${referral.code}" not yet active (start_at=${referral.start_at})`);
      return NextResponse.json({ success: false, message: 'Kode referral belum aktif.' }, { status: 400 });
    }
    if (referral.end_at && new Date(referral.end_at) < now) {
      console.warn(`[Referral Validate] Code "${referral.code}" expired (end_at=${referral.end_at})`);
      return NextResponse.json({ success: false, message: 'Kode referral sudah kadaluarsa.' }, { status: 400 });
    }

    // 5. Check Usage Limit
    const { count: timesUsedCount, error: countError } = await supabase
      .from('referral_redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('referral_code_id', referral.id);

    const timesUsed = timesUsedCount ?? 0;

    if (countError) {
      console.error(`[Referral Validate] Error counting redemptions for "${referral.code}":`, countError);
      return NextResponse.json({ success: false, message: 'Terjadi kesalahan saat validasi penggunaan referral.' }, { status: 500 });
    }

    if (referral.usage_limit && timesUsed >= referral.usage_limit) {
      console.warn(`[Referral Validate] Code "${referral.code}" usage exhausted: ${timesUsed}/${referral.usage_limit}`);
      return NextResponse.json({ success: false, message: 'Batas penggunaan kode referral telah tercapai.' }, { status: 400 });
    }

    console.log(`[Referral Validate] Code "${referral.code}" is valid (used ${timesUsed}/${referral.usage_limit ?? '∞'}, discount=${referral.discount_type} ${referral.discount_value}${referral.max_discount ? ` max=${referral.max_discount}` : ''})`);









    // 6. Determine Discount Type and Value
    const discountPreview = {
      type: referral.discount_type,
      value: referral.discount_value,
      max_discount: referral.max_discount || null,
    };

    // This endpoint is READ-ONLY, so no changes to the database.
    return NextResponse.json({
      success: true,
      message: 'Kode referral valid.',
      referralCode: referral.code,
      discount: discountPreview,
    });


  } catch (error: unknown) {
    console.error('Referral Validation API Error:', error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Terjadi kesalahan internal server.' }, { status: 500 });
  }
}
