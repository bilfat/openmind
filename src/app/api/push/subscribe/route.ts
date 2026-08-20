import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'
import { createAdminClient } from '@/lib/supabase/admin'

interface PushSubscriptionBody {
  subscription?: {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }
  userAgent?: string
}

export async function POST(req: Request) {
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  let body: PushSubscriptionBody
  try {
    body = await req.json()
  } catch {
    return jsonError('Body JSON tidak valid.', 400)
  }

  const endpoint = body.subscription?.endpoint?.trim()
  const p256dh = body.subscription?.keys?.p256dh?.trim()
  const authKey = body.subscription?.keys?.auth?.trim()

  if (!endpoint || !p256dh || !authKey) {
    return jsonError('Subscription tidak valid.', 400)
  }

  const supabase = createAdminClient()

  // Replace any stale row sharing the same endpoint with a fresh one.
  const { error: deleteError } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
  if (deleteError) {
    console.error('Push subscribe delete error:', deleteError.message)
    return jsonError('Gagal menyimpan langganan push.', 500)
  }

  const { error: insertError } = await supabase.from('push_subscriptions').insert({
    profile_id: auth.userId,
    endpoint,
    p256dh,
    auth: authKey,
    user_agent: body.userAgent?.slice(0, 500) || null,
  })
  if (insertError) {
    console.error('Push subscribe insert error:', insertError.message)
    return jsonError('Gagal menyimpan langganan push.', 500)
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const url = new URL(req.url)
  const endpoint = url.searchParams.get('endpoint')?.trim()
  if (!endpoint) return jsonError('Parameter endpoint wajib diisi.', 400)

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('profile_id', auth.userId)
  if (error) {
    console.error('Push unsubscribe error:', error.message)
    return jsonError('Gagal menghapus langganan push.', 500)
  }

  return NextResponse.json({ success: true })
}