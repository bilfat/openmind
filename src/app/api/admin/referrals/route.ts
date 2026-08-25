import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError, parsePagination, parseSearch, MAX_PAGE_SIZE } from '@/lib/admin-read-auth'
import { withTimeoutGuard } from '@/lib/timeout'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const VALID_REFERRAL_STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE', 'EXPIRED', 'EXHAUSTED', 'ARCHIVED']
const VALID_DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED']

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

  if (profileError || !userProfile || userProfile.status !== 'ACTIVE' || !['ADMIN', 'SUPER_ADMIN'].includes(userProfile.role)) {
    return {
      authorized: false as const,
      status: 403,
      message: 'Forbidden: Hanya Admin yang dapat mengelola kode referal.',
    }
  }

  return { authorized: true as const, supabaseAdmin, userId: authResult.userId }
}

/* ── POST body schema ──────────────────────────────────────────────────── */

const CreateReferralSchema = z.object({
  code: z.string().min(4, 'Kode referal minimal 4 karakter.').max(20, 'Kode referal maksimal 20 karakter.').regex(/^[A-Z0-9]+$/, 'Kode referal hanya boleh huruf kapital dan angka.'),
  discount_type: z.enum(['PERCENTAGE', 'FIXED']),
  discount_value: z.number().positive('Nilai diskon harus lebih dari 0.'),
  max_discount: z.number().nonnegative().nullable().optional(),
  usage_limit: z.number().int().positive().nullable().optional(),
  start_at: z.string().min(1, 'Tanggal mulai wajib diisi.'),
  end_at: z.string().min(1, 'Tanggal berakhir wajib diisi.'),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']),
  description: z.string().optional(),
})

/* ── GET /api/admin/referrals ──────────────────────────────────────────── */

async function handleGetReferrals(request: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const url = new URL(request.url)
  const pagination = parsePagination(url.searchParams, MAX_PAGE_SIZE)
  if ('error' in pagination) return jsonError(pagination.error ?? 'Parameter pagination tidak valid.', 400)
  const parsedSearch = parseSearch(url.searchParams)
  if ('error' in parsedSearch) return jsonError(parsedSearch.error ?? 'Parameter search tidak valid.', 400)

  const status = url.searchParams.get('status')?.trim().toUpperCase() || ''
  const discountType = url.searchParams.get('discount_type')?.trim().toUpperCase() || ''

  if (status && !VALID_REFERRAL_STATUSES.includes(status)) return jsonError('Status filter tidak valid.', 400)
  if (discountType && !VALID_DISCOUNT_TYPES.includes(discountType)) return jsonError('Tipe diskon filter tidak valid.', 400)

  try {
    const { supabaseAdmin } = auth

    let query = supabaseAdmin
      .from('referral_codes')
      .select('*', { count: 'exact' })

    if (parsedSearch.search) {
      query = query.ilike('code', `%${parsedSearch.search}%`)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (discountType) {
      query = query.eq('discount_type', discountType)
    }

    const { data: rows, count, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1)

    if (error) throw new Error(error.message)

    const referralIds = (rows ?? []).map((r) => r.id)

    const usageCounts: Record<string, number> = {}
    if (referralIds.length) {
      const { data: redemptions, error: countError } = await supabaseAdmin
        .from('referral_redemptions')
        .select('referral_code_id')
        .in('referral_code_id', referralIds)
        .in('status', ['RESERVED', 'CONSUMED'])

      if (countError) throw new Error(countError.message)

      for (const row of redemptions ?? []) {
        usageCounts[row.referral_code_id] = (usageCounts[row.referral_code_id] || 0) + 1
      }
    }

    const items = (rows ?? []).map((row) => ({
      id: row.id,
      code: row.code,
      discountType: row.discount_type,
      discountValue: row.discount_value,
      maxDiscount: row.max_discount,
      usageLimit: row.usage_limit,
      usedCount: usageCounts[row.id] || 0,
      startDate: row.start_at,
      endDate: row.end_at,
      status: row.status,
      description: row.description,
      createdAt: row.created_at,
      eventId: row.event_id,
    }))

    const total = count ?? 0
    return NextResponse.json({
      success: true,
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    })
  } catch (error) {
    console.error('Admin referrals read error:', error)
    return jsonError('Gagal mengambil data kode referal.', 500)
  }
}

/* ── POST /api/admin/referrals ─────────────────────────────────────────── */

async function handleCreateReferral(request: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Payload request tidak valid.', 400)
  }

  const validation = CreateReferralSchema.safeParse(body)
  if (!validation.success) {
    return jsonError(
      'Data tidak valid: ' + validation.error.issues.map((i) => i.message).join('; '),
      400,
    )
  }

  const data = validation.data

  if (data.discount_type === 'PERCENTAGE' && data.discount_value > 100) {
    return jsonError('Nilai diskon persentase tidak boleh lebih dari 100%.', 400)
  }

  if (new Date(data.end_at) <= new Date(data.start_at)) {
    return jsonError('Tanggal berakhir harus setelah tanggal mulai.', 400)
  }

  try {
    const { supabaseAdmin, userId } = auth

    // ── Resolve exactly one ACTIVE event ──────────────────────────────
    const { data: activeEvents, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('status', 'ACTIVE')

    if (eventError) throw new Error(eventError.message)

    if (!activeEvents || activeEvents.length === 0) {
      return jsonError('Tidak ada event aktif. Buat event terlebih dahulu.', 400)
    }
    if (activeEvents.length > 1) {
      return jsonError('Konfigurasi error: lebih dari satu event ACTIVE. Hubungi administrator.', 400)
    }

    const eventId = activeEvents[0].id

    // ── Insert referral code ──────────────────────────────────────────
    const { data: created, error: insertError } = await supabaseAdmin
      .from('referral_codes')
      .insert({
        event_id: eventId,
        code: data.code.toUpperCase(),
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        max_discount: data.max_discount ?? null,
        usage_limit: data.usage_limit ?? null,
        start_at: data.start_at,
        end_at: data.end_at,
        status: data.status,
        description: data.description ?? null,
        created_by: userId,
      })
      .select('*')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return jsonError(`Kode referal "${data.code.toUpperCase()}" sudah digunakan untuk event ini.`, 409)
      }
      throw new Error(insertError.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Kode referal berhasil dibuat.',
      item: {
        id: created.id,
        code: created.code,
        discountType: created.discount_type,
        discountValue: created.discount_value,
        maxDiscount: created.max_discount,
        usageLimit: created.usage_limit,
        usedCount: 0,
        startDate: created.start_at,
        endDate: created.end_at,
        status: created.status,
        description: created.description,
        createdAt: created.created_at,
        eventId: created.event_id,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Admin referral create error:', error)
    return jsonError('Gagal membuat kode referal.', 500)
  }
}

/* ── Exports ───────────────────────────────────────────────────────────── */

export const GET = withTimeoutGuard(handleGetReferrals)

export async function POST(request: Request) {
  return handleCreateReferral(request)
}
