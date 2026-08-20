import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'
import { sendPushToProfile } from '@/lib/webpush'

export async function POST(req: Request) {
  const auth = await requireActiveAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  let body: { title?: string; message?: string; link?: string }
  try {
    body = await req.json()
  } catch {
    return jsonError('Body JSON tidak valid.', 400)
  }

  const title = (body.title || 'Notifikasi Test').trim().slice(0, 100)
  const message = (body.message || 'Ini notifikasi uji coba dari OPEN MIND.').trim().slice(0, 300)

  // FAIL-OPEN: push errors are swallowed inside sendPushToProfile.
  await sendPushToProfile(auth.userId, {
    title,
    message,
    link: body.link || null,
    type: 'SYSTEM',
  })

  return NextResponse.json({ success: true })
}