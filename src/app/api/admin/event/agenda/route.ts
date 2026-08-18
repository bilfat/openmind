import { NextResponse } from 'next/server'
import { jsonError } from '@/lib/admin-read-auth'
import { requireEventSuperAdmin, getActiveEventId } from '@/lib/event-admin-auth'
import { writeAuditLog } from '@/lib/audit'

function cleanString(value: unknown, maxLength: number): string | undefined | null {
  if (value === null || value === undefined) return value as string | null | undefined
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed
}

// GET /api/admin/event/agenda - List agenda of the active event
export async function GET() {
  const auth = await requireEventSuperAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const eventId = await getActiveEventId(auth.supabaseAdmin)
  if (!eventId) return jsonError('Event aktif tidak ditemukan.', 404)

  const { data, error } = await auth.supabaseAdmin
    .from('event_agenda')
    .select('*')
    .eq('event_id', eventId)
    .order('session_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return jsonError(`Gagal memuat agenda: ${error.message}`, 500)
  return NextResponse.json({ success: true, data })
}

// POST /api/admin/event/agenda - Create an agenda item
export async function POST(req: Request) {
  const auth = await requireEventSuperAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonError('Payload request tidak valid.', 400)
  }

  const title = cleanString(body.title, 300)
  if (!title) return jsonError('Judul sesi wajib diisi.', 400)

  const eventId = await getActiveEventId(auth.supabaseAdmin)
  if (!eventId) return jsonError('Event aktif tidak ditemukan.', 404)

  const speakerId = body.speaker_id
  if (speakerId !== null && speakerId !== undefined && typeof speakerId !== 'string') {
    return jsonError('speaker_id tidak valid.', 400)
  }

  const insertData: Record<string, unknown> = {
    event_id: eventId,
    title,
    description: cleanString(body.description, 4000),
    speaker_id: typeof speakerId === 'string' && speakerId.trim() !== '' ? speakerId : null,
    start_time: cleanString(body.start_time, 10),
    end_time: cleanString(body.end_time, 10),
    location: cleanString(body.location, 300),
    session_order: typeof body.session_order === 'number' ? Math.max(0, Math.round(body.session_order)) : 0,
    is_visible: typeof body.is_visible === 'boolean' ? body.is_visible : true,
  }

  const { data, error } = await auth.supabaseAdmin
    .from('event_agenda')
    .insert(insertData)
    .select('*')
    .single()

  if (error) return jsonError(`Gagal menambah agenda: ${error.message}`, 500)

  await writeAuditLog({
    actorProfileId: auth.userId,
    action: 'CREATE_EVENT_AGENDA',
    entityType: 'event_agenda',
    entityId: data.id,
    metadata: { title: data.title },
    client: auth.supabaseAdmin,
  })

  return NextResponse.json({ success: true, message: 'Agenda berhasil ditambahkan.', data })
}
