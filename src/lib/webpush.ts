import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PushNotificationPayload {
  title: string
  message: string
  link?: string | null
  type?: string
}

let vapidReady = false

function ensureVapidConfigured(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT

  if (!publicKey || !privateKey || !subject) return false

  if (!vapidReady) {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    vapidReady = true
  }
  return true
}

/**
 * Sends one push notification to a single stored subscription.
 * FAIL-OPEN: errors are logged server-side and swallowed.
 * Expired/invalid subscriptions (404/410) are removed from the DB.
 */
async function sendToSubscription(
  sub: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: PushNotificationPayload
): Promise<void> {
  if (!ensureVapidConfigured()) return

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload)
    )
  } catch (err: any) {
    const statusCode = err?.statusCode
    if (statusCode === 404 || statusCode === 410) {
      try {
        const supabase = createAdminClient()
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      } catch {
        // ignore cleanup failure
      }
    }
    console.error(`Web push send failed (${sub.endpoint?.slice(0, 40)}...):`, err?.message || err)
  }
}

/**
 * Sends a push notification to every device subscribed by a profile.
 * FAIL-OPEN: never throws.
 */
export async function sendPushToProfile(profileId: string, payload: PushNotificationPayload): Promise<void> {
  if (!ensureVapidConfigured()) return

  try {
    const supabase = createAdminClient()
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('profile_id', profileId)

    if (error || !subs || subs.length === 0) return

    await Promise.all(subs.map((s) => sendToSubscription(s, payload)))
  } catch (err: any) {
    console.error('sendPushToProfile threw:', err?.message || err)
  }
}

/**
 * Sends a push notification to every device subscribed by ACTIVE admins.
 * FAIL-OPEN: never throws.
 */
export async function sendPushToAllAdmins(payload: PushNotificationPayload): Promise<void> {
  if (!ensureVapidConfigured()) return

  try {
    const supabase = createAdminClient()

    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['ADMIN', 'SUPER_ADMIN'])
      .eq('status', 'ACTIVE')

    if (adminsError || !admins || admins.length === 0) return

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in(
        'profile_id',
        admins.map((a) => a.id)
      )

    if (error || !subs || subs.length === 0) return

    await Promise.all(subs.map((s) => sendToSubscription(s, payload)))
  } catch (err: any) {
    console.error('sendPushToAllAdmins threw:', err?.message || err)
  }
}