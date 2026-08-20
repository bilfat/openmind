import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeAuditLog } from '@/lib/audit'

interface AdminUserResponse {
  id: string
  email: string
  full_name: string
  role: string
  status: string
  last_login_at: string | null
  created_at: string
  updated_at: string
}

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
      message: 'Forbidden: Hanya Super Admin yang dapat mengelola akun admin.',
    }
  }

  return { authorized: true as const, supabaseAdmin, userId: authResult.userId }
}

// GET /api/admin/admins - List admin profiles with pagination and filters
export async function GET(req: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.authorized) {
    return jsonError(auth.message, auth.status)
  }

  const { searchParams } = new URL(req.url)
  const rawPage = searchParams.get('page') ?? '1'
  const rawLimit = searchParams.get('limit') ?? '25'
  const page = Math.max(1, parseInt(rawPage, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 25))
  const search = (searchParams.get('search') ?? '').trim().toLowerCase()
  const statusFilter = searchParams.get('status')
  const roleFilter = searchParams.get('role')

  try {
    // 1. Fetch profiles
    let query = auth.supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, status, last_login_at, created_at, updated_at', { count: 'exact' })

    if (statusFilter && ['ACTIVE', 'INACTIVE'].includes(statusFilter)) {
      query = query.eq('status', statusFilter)
    }
    if (roleFilter && ['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(roleFilter)) {
      query = query.eq('role', roleFilter)
    }

    const { data: profiles, error: profileError } = await query.order('created_at', { ascending: false })

    if (profileError) {
      return jsonError(`Gagal mengambil data profile admin: ${profileError.message}`, 500)
    }

    // 2. Fetch auth users to get email
    const { data: authUsersData, error: authUsersError } = await auth.supabaseAdmin.auth.admin.listUsers()

    if (authUsersError) {
      return jsonError(`Gagal mengambil data auth admin: ${authUsersError.message}`, 500)
    }

    const authUserMap = new Map(authUsersData.users.map((u) => [u.id, u]))

    // 3. Map and sanitize response (STRICTLY REDACT SENSITIVE DATA)
    let adminList: AdminUserResponse[] = (profiles || []).map((p) => {
      const authUser = authUserMap.get(p.id)
      return {
        id: p.id,
        email: authUser?.email || '',
        full_name: p.full_name,
        role: p.role,
        status: p.status,
        last_login_at: p.last_login_at || authUser?.last_sign_in_at || null,
        created_at: p.created_at,
        updated_at: p.updated_at,
      }
    })

    // Search filter across full_name and email
    if (search) {
      adminList = adminList.filter(
        (a) => a.full_name.toLowerCase().includes(search) || a.email.toLowerCase().includes(search)
      )
    }

    const total = adminList.length
    const offset = (page - 1) * limit
    const paginatedData = adminList.slice(offset, offset + limit)
    const totalPages = Math.ceil(total / limit) || 1

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonError(`Server error: ${message}`, 500)
  }
}

// POST /api/admin/admins - Create a new Admin profile with compensating cleanup
export async function POST(req: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.authorized) {
    return jsonError(auth.message, auth.status)
  }

  let body: {
    email?: string
    password?: string
    full_name?: string
    role?: string
  }

  try {
    body = await req.json()
  } catch {
    return jsonError('Body JSON tidak valid.', 400)
  }

  const { email, password, full_name, role } = body

  // Guardrail 5: Role Safety - Prevent creating SUPER_ADMIN, allow ADMIN / STAFF
  const targetRole = (role ?? 'ADMIN').toString().toUpperCase()
  if (targetRole === 'SUPER_ADMIN') {
    return jsonError('Pembuatan akun Super Admin tidak diizinkan via API ini.', 400)
  }
  if (!['ADMIN', 'STAFF'].includes(targetRole)) {
    return jsonError('Role tidak valid. Harus ADMIN atau STAFF.', 400)
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return jsonError('Email tidak valid.', 400)
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return jsonError('Password minimal 6 karakter.', 400)
  }
  if (!full_name || typeof full_name !== 'string' || full_name.trim() === '') {
    return jsonError('Nama lengkap wajib diisi.', 400)
  }

  const sanitizedEmail = email.trim().toLowerCase()
  const sanitizedFullName = full_name.trim()

  // Guardrail 1: Compensating Cleanup Flow
  // Step 1: Create auth user
  const { data: createData, error: createError } = await auth.supabaseAdmin.auth.admin.createUser({
    email: sanitizedEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: sanitizedFullName },
  })

  if (createError || !createData.user) {
    const errorMsg = createError?.message || 'Gagal membuat akun auth.'
    if (errorMsg.toLowerCase().includes('already') || errorMsg.toLowerCase().includes('exists')) {
      return jsonError('Email sudah terdaftar.', 409)
    }
    return jsonError(`Gagal membuat akun admin: ${errorMsg}`, 400)
  }

  const newUserId = createData.user.id

  // Step 2 & 3: Database trigger `on_auth_user_created` creates profile, now sync profile
  try {
    const { data: updatedProfile, error: updateError } = await auth.supabaseAdmin
      .from('profiles')
      .update({
        full_name: sanitizedFullName,
        role: targetRole,
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', newUserId)
      .select('id, full_name, role, status, last_login_at, created_at, updated_at')
      .single()

    if (updateError || !updatedProfile) {
      // Step 4: Compensating cleanup if profile sync failed
      console.error('Profile sync failed, performing compensating cleanup on auth user:', newUserId)
      await auth.supabaseAdmin.auth.admin.deleteUser(newUserId)
      return jsonError('Gagal menyinkronkan profil admin. Akun telah dibersihkan.', 500)
    }

    // Step 5: Audit Log Insertion (Phase 21) with failure policy & compensating cleanup
    try {
      await writeAuditLog({
        actorProfileId: auth.userId,
        action: 'CREATE_ADMIN',
        entityType: 'profiles',
        entityId: updatedProfile.id,
        metadata: {
          full_name: updatedProfile.full_name,
          email: sanitizedEmail,
          role: updatedProfile.role,
        },
        client: auth.supabaseAdmin,
      })
    } catch (auditErr: unknown) {
      console.error('Audit logging failed during admin creation, performing compensating cleanup:', auditErr)
      await auth.supabaseAdmin.auth.admin.deleteUser(newUserId)
      return jsonError('Gagal mencatat log audit. Akun admin telah dibersihkan.', 500)
    }

    // Step 6: Return sanitized response
    const sanitizedResponse: AdminUserResponse = {
      id: updatedProfile.id,
      email: sanitizedEmail,
      full_name: updatedProfile.full_name,
      role: updatedProfile.role,
      status: updatedProfile.status,
      last_login_at: updatedProfile.last_login_at || null,
      created_at: updatedProfile.created_at,
      updated_at: updatedProfile.updated_at,
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Akun admin berhasil dibuat.',
        data: sanitizedResponse,
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    // Compensating cleanup on unhandled error
    console.error('Unhandled exception during profile sync, performing compensating cleanup:', err)
    await auth.supabaseAdmin.auth.admin.deleteUser(newUserId)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return jsonError(`Gagal memproses pendaftaran admin: ${msg}`, 500)
  }
}
