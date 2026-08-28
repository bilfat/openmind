import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  try {
    // Fetch all referral codes that might need status update:
    // - ACTIVE (might become EXPIRED/EXHAUSTED)
    // - DRAFT/INACTIVE with start_at <= now (might become ACTIVE)
    const { data: referrals, error: fetchError } = await supabase
      .from('referral_codes')
      .select('id, start_at, end_at, usage_limit, used_count, status')
      .in('status', ['ACTIVE', 'DRAFT', 'INACTIVE']);

    if (fetchError) throw new Error(fetchError.message);

    let updated = 0;
    const errors: string[] = [];

    for (const ref of referrals ?? []) {
      let newStatus: typeof ref.status | null = null;

      // 1. If start time has arrived and status is DRAFT/INACTIVE -> ACTIVE
      if (
        (ref.status === 'DRAFT' || ref.status === 'INACTIVE') &&
        ref.start_at &&
        new Date(ref.start_at) <= new Date(now)
      ) {
        newStatus = 'ACTIVE';
      }
      // 2. If currently ACTIVE, check for expiry/exhaustion
      else if (ref.status === 'ACTIVE') {
        if (ref.end_at && new Date(ref.end_at) <= new Date(now)) {
          newStatus = 'EXPIRED';
        } else if (
          ref.usage_limit !== null &&
          ref.usage_limit > 0 &&
          ref.used_count >= ref.usage_limit
        ) {
          newStatus = 'EXHAUSTED';
        }
      }

      if (newStatus && newStatus !== ref.status) {
        const { error: updateError } = await supabase
          .from('referral_codes')
          .update({ status: newStatus, updated_at: now })
          .eq('id', ref.id);

        if (updateError) {
          errors.push(`Failed to update ${ref.id}: ${updateError.message}`);
        } else {
          updated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      checked: referrals?.length ?? 0,
      updated,
      errors: errors.length ? errors : undefined,
    });
  } catch (error) {
    console.error('Cron update-referral-status error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}