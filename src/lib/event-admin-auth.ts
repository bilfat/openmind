import 'server-only'
import { requireActiveAdmin } from '@/lib/admin-read-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

export type EventAdminAuth =
  | { authorized: true; supabaseAdmin: SupabaseClient; userId: string }
  | { authorized: false; status: number; message: string }

export async function requireEventSuperAdmin(): Promise<EventAdminAuth> {
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
      message: 'Forbidden: Hanya Super Admin yang dapat mengelola pengaturan event.',
    }
  }

  return { authorized: true as const, supabaseAdmin, userId: authResult.userId }
}

export async function getActiveEventId(supabaseAdmin: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('status', 'ACTIVE')
    .maybeSingle()
  if (error || !data) return null
  return data.id
}
