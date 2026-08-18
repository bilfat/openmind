import { NextResponse } from 'next/server'
import { jsonError } from '@/lib/admin-read-auth'
import { requireEventSuperAdmin } from '@/lib/event-admin-auth'
import { writeAuditLog } from '@/lib/audit'

const SPEAKER_FIELDS = [
  'name',
  'role',
  'role_label',
  'position',
  'business',
  'bio',
  'photo_url',
  'instagram',
  'linkedin',
  'display_order',
  'is_visible',
] as const

function sanitizeString(value: unknown, maxLength: number): string | undefined | null {
  if (value === null || value === undefined) return value as string | null | undefined
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed
}

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireEventSuperAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const { id } = await params
  if (!id) return jsonError('ID pembicara tidak valid.', 400)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonError('Payload request tidak valid.', 400)
  }

  const { data: existing } = await auth.supabaseAdmin
    .from('event_speakers')
    .select('id, name, role, display_order')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return jsonError('Pembicara tidak ditemukan.', 404)

  const updates: Record<string, unknown> = {}
  for (const field of SPEAKER_FIELDS) {
    if (!(field in body)) continue
    if (field === 'name') {
      const name = sanitizeString(body.name, 200)
      if (!name) return jsonError('Nama pembicara wajib diisi.', 400)
      updates.name = name
    } else if (field === 'role') {
      const role = sanitizeString(body.role, 20) || 'speaker'
      if (!['speaker', 'moderator', 'mc'].includes(role)) return jsonError('Role pembicara tidak valid.', 400)
      updates.role = role
    } else if (field === 'display_order') {
      updates.display_order = typeof body.display_order === 'number' ? Math.max(0, Math.round(body.display_order)) : existing.display_order ?? 0
    } else if (field === 'is_visible') {
      updates.is_visible = typeof body.is_visible === 'boolean' ? body.is_visible : true
    } else {
      updates[field] = sanitizeString(body[field], field === 'bio' ? 4000 : 1000)
    }
  }

  if (Object.keys(updates).length === 0) return jsonError('Tidak ada field valid yang diperbarui.', 400)

  updates.updated_at = new Date().toISOString()

  const { data, error } = await auth.supabaseAdmin
    .from('event_speakers')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return jsonError(`Gagal memperbarui pembicara: ${error.message}`, 500)

  await writeAuditLog({
    actorProfileId: auth.userId,
    action: 'UPDATE_EVENT_SPEAKER',
    entityType: 'event_speakers',
    entityId: id,
    metadata: { updated_fields: Object.keys(updates) },
    client: auth.supabaseAdmin,
  })

  return NextResponse.json({ success: true, message: 'Pembicara berhasil diperbarui.', data })
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireEventSuperAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const { id } = await params
  if (!id) return jsonError('ID pembicara tidak valid.', 400)

  const { data: existing } = await auth.supabaseAdmin
    .from('event_speakers')
    .select('id, name')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return jsonError('Pembicara tidak ditemukan.', 404)

  const { error } = await auth.supabaseAdmin.from('event_speakers').delete().eq('id', id)
  if (error) return jsonError(`Gagal menghapus pembicara: ${error.message}`, 500)

  await writeAuditLog({
    actorProfileId: auth.userId,
    action: 'DELETE_EVENT_SPEAKER',
    entityType: 'event_speakers',
    entityId: id,
    metadata: { name: existing.name },
    client: auth.supabaseAdmin,
  })

  return NextResponse.json({ success: true, message: 'Pembicara berhasil dihapus.' })
}
