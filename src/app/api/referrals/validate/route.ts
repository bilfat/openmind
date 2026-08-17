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



    // 1. Fetch Referral Code

    const { data: referral, error: fetchError } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('code', referralCode.toUpperCase())
      .single() as { data: Referral | null, error: PostgrestError | null };


    if (fetchError || !referral) {
      console.warn(`Referral code not found or error fetching: ${referralCode}, Error: ${fetchError?.message}`);
      return NextResponse.json({ success: false, message: 'Kode referral tidak ditemukan.' }, { status: 404 });
    }

    // 4. Check Validity Dates
    const now = new Date();
    if (referral.start_at && new Date(referral.start_at) > now) {
      return NextResponse.json({ success: false, message: 'Kode referral belum aktif.' }, { status: 400 });
    }
    if (referral.end_at && new Date(referral.end_at) < now) {
      return NextResponse.json({ success: false, message: 'Kode referral sudah kadaluarsa.' }, { status: 400 });
    }

    // 2. Check Referral Status
    if (referral.status !== 'ACTIVE') {
      return NextResponse.json({ success: false, message: 'Kode referral tidak aktif.' }, { status: 400 });
    }
    // 3. Check Event Applicability
    if (referral.event_id && referral.event_id !== eventId) {
      return NextResponse.json({ success: false, message: 'Kode referral tidak berlaku untuk event ini.' }, { status: 400 });
    }










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
