import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

/* ── Inline SUPER_ADMIN gate (mirrors event/route.ts pattern) ──────────── */

async function requireSuperAdmin() {
  const authResult = await requireActiveAdmin()
  if (!authResult.authorized) {
    return { authorized: false as const, status: authResult.status, message: authResult.message }
  }

  const supabaseAdmin = createAdminClient()
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role, status')
    .eq('id', authResult.userId)
    .maybeSingle()

  if (profileError || !userProfile || userProfile.status !== 'ACTIVE' || userProfile.role !== 'SUPER_ADMIN') {
    return {
      authorized: false as const,
      status: 403,
      message: 'Forbidden: Hanya Super Admin yang dapat mengelola kode referal.',
    }
  }

  return { authorized: true as const, supabaseAdmin, userId: authResult.userId }
}

/* ── PATCH body schema ─────────────────────────────────────────────────── */

const UpdateReferralSchema = z.object({
  code: z.string().min(4).max(20).regex(/^[A-Z0-9]+$/).optional(),
  discount_type: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  discount_value: z.number().positive().optional(),
  max_discount: z.number().nonnegative().nullable().optional(),
  usage_limit: z.number().int().positive().nullable().optional(),
  start_at: z.string().min(1).optional(),
  end_at: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'EXPIRED', 'EXHAUSTED', 'ARCHIVED']).optional(),
  description: z.string().nullable().optional(),
})

/* ── Helper: map DB row to frontend shape ──────────────────────────────── */

function rowToFrontend(row: Record<string, unknown>, usedCount: number) {
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
    status: row.status,
    description: row.description,
    createdAt: row.created_at,
    eventId: row.event_id,
  }
}

/* ── GET /api/admin/referrals/[id] ─────────────────────────────────────── */

type RouteContext = { params: Promise<{ id: string }> }

async function handleGetReferral(_request: Request, context: RouteContext) {
  const auth = await requireSuperAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const { id } = await context.params

  try {
    const { supabaseAdmin } = auth

    const { data: row, error } = await supabaseAdmin
      .from('referral_codes')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !row) {
      return jsonError('Kode referal tidak ditemukan.', 404)
    }

    const { count: usedCount, error: countError } = await supabaseAdmin
      .from('referral_redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('referral_code_id', id)

    if (countError) throw new Error(countError.message)

    return NextResponse.json({
      success: true,
      item: rowToFrontend(row, usedCount ?? 0),
    })
  } catch (error) {
    console.error('Admin referral detail error:', error)
    return jsonError('Gagal mengambil detail kode referal.', 500)
  }
}

/* ── PATCH /api/admin/referrals/[id] ───────────────────────────────────── */

async function handleUpdateReferral(request: Request, context: RouteContext) {
  const auth = await requireSuperAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const { id } = await context.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Payload request tidak valid.', 400)
  }

  const validation = UpdateReferralSchema.safeParse(body)
  if (!validation.success) {
    return jsonError(
      'Data tidak valid: ' + validation.error.issues.map((i) => i.message).join('; '),
      400,
    )
  }

  const data = validation.data

  if (Object.keys(data).length === 0) {
    return jsonError('Tidak ada field yang diperbarui.', 400)
  }

  if (data.discount_type === 'PERCENTAGE' && data.discount_value !== undefined && data.discount_value > 100) {
    return jsonError('Nilai diskon persentase tidak boleh lebih dari 100%.', 400)
  }

  if (data.start_at && data.end_at && new Date(data.end_at) <= new Date(data.start_at)) {
    return jsonError('Tanggal berakhir harus setelah tanggal mulai.', 400)
  }

  try {
    const { supabaseAdmin } = auth

    // ── Fetch current row ────────────────────────────────────────────
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('referral_codes')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return jsonError('Kode referal tidak ditemukan.', 404)
    }

    // ── Check usage_limit vs current usage ────────────────────────────
    if (data.usage_limit !== undefined && data.usage_limit !== null) {
      const { count: usedCount, error: countError } = await supabaseAdmin
        .from('referral_redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('referral_code_id', id)

      if (countError) throw new Error(countError.message)

      if (data.usage_limit < (usedCount ?? 0)) {
        return jsonError(`Kuota tidak boleh lebih kecil dari jumlah yang telah digunakan (${usedCount} kali).`, 400)
      }
    }

    // ── Build update payload ──────────────────────────────────────────
    const updates: Record<string, unknown> = {}
    if (data.code !== undefined) updates.code = data.code.toUpperCase()
    if (data.discount_type !== undefined) updates.discount_type = data.discount_type
    if (data.discount_value !== undefined) updates.discount_value = data.discount_value
    if (data.max_discount !== undefined) updates.max_discount = data.max_discount
    if (data.usage_limit !== undefined) updates.usage_limit = data.usage_limit
    if (data.start_at !== undefined) updates.start_at = data.start_at
    if (data.end_at !== undefined) updates.end_at = data.end_at
    if (data.status !== undefined) updates.status = data.status
    if (data.description !== undefined) updates.description = data.description
    updates.updated_at = new Date().toISOString()

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('referral_codes')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      if (updateError.code === '23505') {
        return jsonError(`Kode referal "${data.code?.toUpperCase()}" sudah digunakan untuk event ini.`, 409)
      }
      throw new Error(updateError.message)
    }

    const { count: usedCount } = await supabaseAdmin
      .from('referral_redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('referral_code_id', id)

    return NextResponse.json({
      success: true,
      message: 'Kode referal berhasil diperbarui.',
      item: rowToFrontend(updated, usedCount ?? 0),
    })
  } catch (error) {
    console.error('Admin referral update error:', error)
    return jsonError('Gagal memperbarui kode referal.', 500)
  }
}

/* ── Exports (NO DELETE — deferred) ────────────────────────────────────── */

export async function GET(request: Request, context: RouteContext) {
  return handleGetReferral(request, context)
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleUpdateReferral(request, context)
}
