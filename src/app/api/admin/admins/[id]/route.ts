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

// GET /api/admin/admins/[id] - Get detail of single admin account
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if (!auth.authorized) {
    return jsonError(auth.message, auth.status)
  }

  const { id: targetId } = await params

  if (!targetId) {
    return jsonError('ID admin tidak valid.', 400)
  }

  try {
    const { data: profile, error: profileError } = await auth.supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, status, last_login_at, created_at, updated_at')
      .eq('id', targetId)
      .maybeSingle()

    if (profileError || !profile) {
      return jsonError('Akun admin tidak ditemukan.', 404)
    }

    const { data: authUserData } = await auth.supabaseAdmin.auth.admin.getUserById(targetId)

    const sanitizedResponse: AdminUserResponse = {
      id: profile.id,
      email: authUserData?.user?.email || '',
      full_name: profile.full_name,
      role: profile.role,
      status: profile.status,
      last_login_at: profile.last_login_at || authUserData?.user?.last_sign_in_at || null,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    }

    return NextResponse.json({
      success: true,
      data: sanitizedResponse,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonError(`Server error: ${message}`, 500)
  }
}

// PATCH /api/admin/admins/[id] - Update admin status, password, or name
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if (!auth.authorized) {
    return jsonError(auth.message, auth.status)
  }

  const { id: targetId } = await params

  if (!targetId) {
    return jsonError('ID admin tidak valid.', 400)
  }

  let body: {
    full_name?: string
    password?: string
    status?: string
    role?: string
  }

  try {
    body = await req.json()
  } catch {
    return jsonError('Body JSON tidak valid.', 400)
  }

  const { full_name, password, status, role } = body

  // Guardrail 5: Role Safety
  if (role && role.toUpperCase() === 'SUPER_ADMIN') {
    return jsonError('Perubahan role menjadi Super Admin tidak diizinkan.', 400)
  }

  // Check target profile existence
  const { data: targetProfile, error: targetError } = await auth.supabaseAdmin
    .from('profiles')
    .select('id, full_name, role, status')
    .eq('id', targetId)
    .maybeSingle()

  if (targetError || !targetProfile) {
    return jsonError('Akun admin tidak ditemukan.', 404)
  }

  // Guardrail 7: Self deactivation check
  if (targetId === auth.userId && status === 'INACTIVE') {
    return jsonError('Super Admin tidak dapat menonaktifkan akun sendiri.', 400)
  }

  // Validation
  if (password !== undefined) {
    if (typeof password !== 'string' || password.length < 6) {
      return jsonError('Password minimal 6 karakter.', 400)
    }
  }

  if (status !== undefined) {
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return jsonError('Status admin tidak valid. Harus ACTIVE atau INACTIVE.', 400)
    }
  }

  if (full_name !== undefined) {
    if (typeof full_name !== 'string' || full_name.trim() === '') {
      return jsonError('Nama lengkap tidak boleh kosong.', 400)
    }
  }

  try {
    // 1. Update password in Supabase Auth if supplied
    if (password) {
      const { error: passwordError } = await auth.supabaseAdmin.auth.admin.updateUserById(targetId, { password })
      if (passwordError) {
        return jsonError(`Gagal memperbarui password: ${passwordError.message}`, 400)
      }
    }

    // 2. Update profile table if full_name or status supplied
    const profileUpdates: { full_name?: string; status?: string; updated_at: string } = {
      updated_at: new Date().toISOString(),
    }

    if (full_name !== undefined) profileUpdates.full_name = full_name.trim()
    if (status !== undefined) profileUpdates.status = status

    const { data: updatedProfile, error: updateError } = await auth.supabaseAdmin
      .from('profiles')
      .update(profileUpdates)
      .eq('id', targetId)
      .select('id, full_name, role, status, last_login_at, created_at, updated_at')
      .single()

    if (updateError || !updatedProfile) {
      return jsonError(`Gagal memperbarui profil admin: ${updateError?.message || 'Unknown error'}`, 500)
    }

    // 3. Write Audit Log (Phase 21)
    const auditAction = status === 'INACTIVE' ? 'DISABLE_ADMIN' : status === 'ACTIVE' ? 'ENABLE_ADMIN' : 'UPDATE_ADMIN'
    await writeAuditLog({
      actorProfileId: auth.userId,
      action: auditAction,
      entityType: 'profiles',
      entityId: targetId,
      metadata: {
        updated_fields: Object.keys(profileUpdates),
        full_name: updatedProfile.full_name,
        status: updatedProfile.status,
        password_changed: !!password,
      },
      client: auth.supabaseAdmin,
    })

    // 4. Fetch auth user to build sanitized response
    const { data: authUserData } = await auth.supabaseAdmin.auth.admin.getUserById(targetId)

    const sanitizedResponse: AdminUserResponse = {
      id: updatedProfile.id,
      email: authUserData?.user?.email || '',
      full_name: updatedProfile.full_name,
      role: updatedProfile.role,
      status: updatedProfile.status,
      last_login_at: updatedProfile.last_login_at || authUserData?.user?.last_sign_in_at || null,
      created_at: updatedProfile.created_at,
      updated_at: updatedProfile.updated_at,
    }

    return NextResponse.json({
      success: true,
      message: 'Profil admin berhasil diperbarui.',
      data: sanitizedResponse,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonError(`Server error: ${message}`, 500)
  }
}

// DELETE /api/admin/admins/[id] - Delete admin account with protection guards
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if (!auth.authorized) {
    return jsonError(auth.message, auth.status)
  }

  const { id: targetId } = await params

  if (!targetId) {
    return jsonError('ID admin tidak valid.', 400)
  }

  // Guardrail 3: Delete Protection
  // 1. Self deletion block
  if (targetId === auth.userId) {
    return jsonError('Super Admin tidak dapat menghapus akun sendiri.', 400)
  }

  // 2. Fetch target profile
  const { data: targetProfile, error: targetError } = await auth.supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', targetId)
    .maybeSingle()

  if (targetError || !targetProfile) {
    return jsonError('Akun admin tidak ditemukan.', 404)
  }

  // 3. SUPER_ADMIN target reject
  if (targetProfile.role === 'SUPER_ADMIN') {
    return jsonError('Akun Super Admin tidak dapat dihapus via API ini.', 403)
  }

  if (!['ADMIN', 'STAFF'].includes(targetProfile.role)) {
    return jsonError('Hanya akun dengan role ADMIN atau STAFF yang dapat dihapus.', 400)
  }

  try {
    // 4. Write Audit Log before deletion (Phase 21 Audit Failure Policy)
    // If audit logging fails, deletion will NOT be executed.
    await writeAuditLog({
      actorProfileId: auth.userId,
      action: 'DELETE_ADMIN',
      entityType: 'profiles',
      entityId: targetId,
      metadata: {
        deleted_admin_id: targetId,
        target_role: targetProfile.role,
      },
      client: auth.supabaseAdmin,
    })

    // 5. Delete user from auth.users (FK CASCADE removes profile)
    const { error: deleteError } = await auth.supabaseAdmin.auth.admin.deleteUser(targetId)

    if (deleteError) {
      return jsonError(`Gagal menghapus akun admin: ${deleteError.message}`, 500)
    }

    return NextResponse.json({
      success: true,
      message: 'Akun admin berhasil dihapus.',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonError(`Server error: ${message}`, 500)
  }
}
