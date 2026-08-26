import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createAdminClient()

  try {
    const { data: rows, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('is_public', true)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    const referralIds = (rows ?? []).map((r) => r.id)

    const usageCounts: Record<string, number> = {}
    if (referralIds.length) {
      const { data: redemptions, error: countError } = await supabase
        .from('referral_redemptions')
        .select('referral_code_id')
        .in('referral_code_id', referralIds)
        .in('status', ['RESERVED', 'CONSUMED'])

      if (countError) throw new Error(countError.message)

      for (const row of redemptions ?? []) {
        usageCounts[row.referral_code_id] = (usageCounts[row.referral_code_id] || 0) + 1
      }
    }

    const now = new Date()

    const items = (rows ?? []).map((row) => {
      const usedCount = usageCounts[row.id] || 0
      const isExhausted = row.usage_limit && usedCount >= row.usage_limit
      const isExpired = row.end_at && new Date(row.end_at) < now
      const isNotStarted = row.start_at && new Date(row.start_at) > now

      let displayStatus = 'ACTIVE'
      if (isExhausted) displayStatus = 'EXHAUSTED'
      else if (isExpired) displayStatus = 'EXPIRED'
      else if (isNotStarted) displayStatus = 'UPCOMING'

      return {
        id: row.id,
        code: row.code,
        discountType: row.discount_type,
        discountValue: row.discount_value,
        maxDiscount: row.max_discount,
        usageLimit: row.usage_limit,
        usedCount,
        startDate: row.start_at,
        endDate: row.end_at,
        status: displayStatus,
        description: row.description,
        createdAt: row.created_at,
        eventId: row.event_id,
        isPublic: row.is_public,
      }
    })

    return NextResponse.json({
      success: true,
      items,
    })
  } catch (error) {
    console.error('Public referrals fetch error:', error)
    return NextResponse.json({ success: false, message: 'Gagal mengambil data kode referal publik.' }, { status: 500 })
  }
}