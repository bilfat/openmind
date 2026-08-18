import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeMetadata } from '@/lib/audit'
import { SupabaseClient } from '@supabase/supabase-js'

/* eslint-disable @typescript-eslint/no-explicit-any */

export type NotificationType =
  | 'ORDER_NEW'
  | 'ORDER_APPROVED'
  | 'ORDER_REJECTED'
  | 'PAYMENT_RECEIVED'
  | 'CHECK_IN'
  | 'SYSTEM'
  | 'BROADCAST'

export interface CreateNotificationParams {
  profileId: string
  type: NotificationType
  title: string
  message: string
  link?: string | null
  metadata?: Record<string, unknown>
  client?: SupabaseClient
}

export interface BroadcastNotificationParams {
  type: NotificationType
  title: string
  message: string
  link?: string | null
  metadata?: Record<string, unknown>
  client?: SupabaseClient
}

/**
 * Creates a single notification row using a trusted server-side client.
 * FAIL-OPEN: insertion errors are logged server-side and swallowed.
 * Never exposes secrets — metadata is sanitized before insert.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const supabase = params.client || createAdminClient()

  const rawMetadata = params.metadata || {}
  const sanitized = (sanitizeMetadata(rawMetadata) as Record<string, unknown>) || {}

  try {
    const { error } = await supabase.from('notifications').insert({
      profile_id: params.profileId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link || null,
      metadata: sanitized,
    })

    if (error) {
      console.error(`Notification insertion failed (${params.type}):`, error.message)
    }
  } catch (err: any) {
    console.error(`Notification insertion threw (${params.type}):`, err?.message || err)
  }
}

/**
 * Broadcasts one notification per ACTIVE admin (ADMIN / SUPER_ADMIN).
 * FAIL-OPEN: notification failures never block the originating business transaction.
 * Inactive users are excluded.
 */
export async function broadcastToAllAdmins(params: BroadcastNotificationParams): Promise<void> {
  const supabase = params.client || createAdminClient()

  try {
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['ADMIN', 'SUPER_ADMIN'])
      .eq('status', 'ACTIVE')

    if (adminsError || !admins || admins.length === 0) {
      console.error('broadcastToAllAdmins: gagal mengambil daftar admin aktif:', adminsError?.message || 'no admins')
      return
    }

    const rawMetadata = params.metadata || {}
    const sanitized = (sanitizeMetadata(rawMetadata) as Record<string, unknown>) || {}

    const rows = admins.map((admin) => ({
      profile_id: admin.id,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link || null,
      metadata: sanitized,
    }))

    const { error } = await supabase.from('notifications').insert(rows)

    if (error) {
      console.error(`broadcastToAllAdmins insertion failed (${params.type}):`, error.message)
    }
  } catch (err: any) {
    console.error(`broadcastToAllAdmins threw (${params.type}):`, err?.message || err)
  }
}