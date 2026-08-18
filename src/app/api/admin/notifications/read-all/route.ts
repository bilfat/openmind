import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST() {
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  try {
    // RLS guarantees only the authenticated user's own notifications are affected.
    const { data, error } = await auth.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('profile_id', auth.userId)
      .eq('is_read', false)
      .select('id')

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      success: true,
      updated: data?.length ?? 0,
    })
  } catch (err: any) {
    console.error('Mark all notifications read error:', err)
    return jsonError('Gagal menandai semua notifikasi sudah dibaca.', 500)
  }
}