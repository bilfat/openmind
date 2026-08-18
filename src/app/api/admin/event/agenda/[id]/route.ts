import { NextResponse } from 'next/server'
import { jsonError } from '@/lib/admin-read-auth'
import { requireEventSuperAdmin } from '@/lib/event-admin-auth'
import { writeAuditLog } from '@/lib/audit'

const AGENDA_FIELDS = [
  'title',
  'description',
  'speaker_id',
  'start_time',
  'end_time',
  'location',
  'session_order',
  'is_visible',
] as const

function cleanString(value: unknown, maxLength: number): string | undefined | null {
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
  if (!id) return jsonError('ID agenda tidak valid.', 400)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonError('Payload request tidak valid.', 400)
  }

  const { data: existing } = await auth.supabaseAdmin
    .from('event_agenda')
    .select('id, title, session_order')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return jsonError('Agenda tidak ditemukan.', 404)

  const updates: Record<string, unknown> = {}
  for (const field of AGENDA_FIELDS) {
    if (!(field in body)) continue
    if (field === 'title') {
      const title = cleanString(body.title, 300)
      if (!title) return jsonError('Judul sesi wajib diisi.', 400)
      updates.title = title
    } else if (field === 'speaker_id') {
      const speakerId = body.speaker_id
      if (speakerId !== null && typeof speakerId !== 'string') return jsonError('speaker_id tidak valid.', 400)
      updates.speaker_id = typeof speakerId === 'string' && speakerId.trim() !== '' ? speakerId : null
    } else if (field === 'session_order') {
      updates.session_order = typeof body.session_order === 'number' ? Math.max(0, Math.round(body.session_order)) : existing.session_order ?? 0
    } else if (field === 'is_visible') {
      updates.is_visible = typeof body.is_visible === 'boolean' ? body.is_visible : true
    } else {
      updates[field] = cleanString(body[field], field === 'description' ? 4000 : field === 'location' ? 300 : 10)
    }
  }

  if (Object.keys(updates).length === 0) return jsonError('Tidak ada field valid yang diperbarui.', 400)

  updates.updated_at = new Date().toISOString()

  const { data, error } = await auth.supabaseAdmin
    .from('event_agenda')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return jsonError(`Gagal memperbarui agenda: ${error.message}`, 500)

  await writeAuditLog({
    actorProfileId: auth.userId,
    action: 'UPDATE_EVENT_AGENDA',
    entityType: 'event_agenda',
    entityId: id,
    metadata: { updated_fields: Object.keys(updates) },
    client: auth.supabaseAdmin,
  })

  return NextResponse.json({ success: true, message: 'Agenda berhasil diperbarui.', data })
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireEventSuperAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const { id } = await params
  if (!id) return jsonError('ID agenda tidak valid.', 400)

  const { data: existing } = await auth.supabaseAdmin
    .from('event_agenda')
    .select('id, title')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return jsonError('Agenda tidak ditemukan.', 404)

  const { error } = await auth.supabaseAdmin.from('event_agenda').delete().eq('id', id)
  if (error) return jsonError(`Gagal menghapus agenda: ${error.message}`, 500)

  await writeAuditLog({
    actorProfileId: auth.userId,
    action: 'DELETE_EVENT_AGENDA',
    entityType: 'event_agenda',
    entityId: id,
    metadata: { title: existing.title },
    client: auth.supabaseAdmin,
  })

  return NextResponse.json({ success: true, message: 'Agenda berhasil dihapus.' })
}
