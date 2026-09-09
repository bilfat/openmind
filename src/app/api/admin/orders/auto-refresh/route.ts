import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  try {
    const supabase = createAdminClient()
    const { data: event, error } = await supabase
      .from('events')
      .select('orders_auto_refresh_enabled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return jsonError(`Gagal mengambil data pengaturan auto-refresh: ${error.message}`, 500)
    }

    const userRole = auth.role

    return NextResponse.json({
      success: true,
      autoRefreshEnabled: (event as any)?.orders_auto_refresh_enabled ?? true,
      role: userRole,
      isSuperAdmin: userRole === 'SUPER_ADMIN',
    })
  } catch (err: any) {
    return jsonError(`Server error: ${err.message || 'Unknown error'}`, 500)
  }
}

export async function POST(req: Request) {
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  try {
    if (auth.role !== 'SUPER_ADMIN') {
      return jsonError('Forbidden: Hanya Super Admin yang dapat mengubah status Auto-refresh.', 403)
    }

    const supabase = createAdminClient()

    const body = await req.json()
    const { enabled } = body

    if (typeof enabled !== 'boolean') {
      return jsonError('Parameter enabled harus berupa boolean.', 400)
    }

    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !event) {
      return jsonError('Event tidak ditemukan.', 404)
    }

    const { error: updateError } = await supabase
      .from('events')
      .update({ orders_auto_refresh_enabled: enabled })
      .eq('id', event.id)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      autoRefreshEnabled: enabled,
      message: `Auto-refresh pesanan 15 detik berhasil ${enabled ? 'diaktifkan' : 'dinonaktifkan'}.`,
    })
  } catch (err: any) {
    return jsonError(`Server error: ${err.message || 'Unknown error'}`, 500)
  }
}
