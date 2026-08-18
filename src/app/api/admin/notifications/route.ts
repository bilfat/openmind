import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError, parsePagination } from '@/lib/admin-read-auth'
import { withTimeoutGuard } from '@/lib/timeout'

/* eslint-disable @typescript-eslint/no-explicit-any */

async function handleGetNotifications(request: Request) {
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const url = new URL(request.url)
  const pagination = parsePagination(url.searchParams, 50)
  if ('error' in pagination) {
    return jsonError(pagination.error ?? 'Parameter pagination tidak valid.', 400)
  }

  const unreadOnly = url.searchParams.get('unread_only') === 'true'

  try {
    const { supabase, userId } = auth

    let query = supabase
      .from('notifications')
      .select('id, type, title, message, link, is_read, metadata, created_at', { count: 'exact' })
      .eq('profile_id', userId)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1)

    if (error) {
      throw new Error(error.message)
    }

    const { count: unreadCount, error: unreadError } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', userId)
      .eq('is_read', false)

    if (unreadError) {
      throw new Error(unreadError.message)
    }

    const total = count ?? 0
    return NextResponse.json({
      success: true,
      items: data ?? [],
      unread_count: unreadCount ?? 0,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    })
  } catch (err: any) {
    console.error('Admin notifications read error:', err)
    return jsonError('Gagal mengambil data notifikasi.', 500)
  }
}

export const GET = withTimeoutGuard(handleGetNotifications)