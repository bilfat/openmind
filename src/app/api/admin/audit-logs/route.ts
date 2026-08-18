import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError, parsePagination, parseSearch } from '@/lib/admin-read-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { withTimeoutGuard } from '@/lib/timeout'

/* eslint-disable @typescript-eslint/no-explicit-any */

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
      message: 'Forbidden: Hanya Super Admin yang dapat mengakses audit log.',
    }
  }

  return { authorized: true as const, supabaseAdmin, userId: authResult.userId }
}

async function handleGetAuditLogs(request: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.authorized) {
    return jsonError(auth.message, auth.status)
  }

  const url = new URL(request.url)
  const pagination = parsePagination(url.searchParams, 50)
  if ('error' in pagination) {
    return jsonError(pagination.error ?? 'Parameter pagination tidak valid.', 400)
  }

  const parsedSearch = parseSearch(url.searchParams)
  if ('error' in parsedSearch) {
    return jsonError(parsedSearch.error ?? 'Parameter search tidak valid.', 400)
  }

  const actionFilter = url.searchParams.get('action')?.trim() || ''
  const entityTypeFilter = url.searchParams.get('entity_type')?.trim() || ''

  try {
    let query = auth.supabaseAdmin
      .from('audit_logs')
      .select('id, actor_profile_id, action, entity_type, entity_id, metadata, ip_address, user_agent, created_at', { count: 'exact' })

    if (actionFilter) {
      query = query.eq('action', actionFilter)
    }

    if (entityTypeFilter) {
      query = query.eq('entity_type', entityTypeFilter)
    }

    if (parsedSearch.search) {
      query = query.or(`action.ilike.%${parsedSearch.search}%,entity_type.ilike.%${parsedSearch.search}%`)
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1)

    if (error) {
      throw new Error(error.message)
    }

    const total = count ?? 0
    return NextResponse.json({
      success: true,
      items: data ?? [],
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    })
  } catch (err: any) {
    console.error('Audit logs read error:', err)
    return jsonError('Gagal mengambil data audit log.', 500)
  }
}

export const GET = withTimeoutGuard(handleGetAuditLogs)
