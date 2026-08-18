import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const { id: notificationId } = await params

  if (!/^[0-9a-f-]{36}$/i.test(notificationId)) {
    return jsonError('ID notifikasi tidak valid.', 400)
  }

  try {
    // RLS guarantees the authenticated user can only update their OWN notifications.
    // Only is_read is ever touched — no other mutable field is exposed.
    const { data, error } = await auth.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('profile_id', auth.userId)
      .select('id')
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      success: true,
      updated: Boolean(data),
    })
  } catch (err: any) {
    console.error('Mark notification read error:', err)
    return jsonError('Gagal menandai notifikasi sudah dibaca.', 500)
  }
}