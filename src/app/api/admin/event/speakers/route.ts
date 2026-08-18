import { NextResponse } from 'next/server'
import { jsonError } from '@/lib/admin-read-auth'
import { requireEventSuperAdmin, getActiveEventId } from '@/lib/event-admin-auth'
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

// GET /api/admin/event/speakers - List speakers of the active event
export async function GET() {
  const auth = await requireEventSuperAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  const eventId = await getActiveEventId(auth.supabaseAdmin)
  if (!eventId) return jsonError('Event aktif tidak ditemukan.', 404)

  const { data, error } = await auth.supabaseAdmin
    .from('event_speakers')
    .select('*')
    .eq('event_id', eventId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return jsonError(`Gagal memuat pembicara: ${error.message}`, 500)
  return NextResponse.json({ success: true, data })
}

// POST /api/admin/event/speakers - Create a speaker
export async function POST(req: Request) {
  const auth = await requireEventSuperAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonError('Payload request tidak valid.', 400)
  }

  const name = sanitizeString(body.name, 200)
  if (!name) return jsonError('Nama pembicara wajib diisi.', 400)

  const eventId = await getActiveEventId(auth.supabaseAdmin)
  if (!eventId) return jsonError('Event aktif tidak ditemukan.', 404)

  const role = sanitizeString(body.role, 20) || 'speaker'
  const validRoles = ['speaker', 'moderator', 'mc']
  if (!validRoles.includes(role)) return jsonError('Role pembicara tidak valid.', 400)

  const insertData: Record<string, unknown> = {
    event_id: eventId,
    name,
    role,
    role_label: sanitizeString(body.role_label, 200),
    position: sanitizeString(body.position, 300),
    business: sanitizeString(body.business, 300),
    bio: sanitizeString(body.bio, 4000),
    photo_url: sanitizeString(body.photo_url, 1000),
    instagram: sanitizeString(body.instagram, 500),
    linkedin: sanitizeString(body.linkedin, 500),
    display_order: typeof body.display_order === 'number' ? Math.max(0, Math.round(body.display_order)) : 0,
    is_visible: typeof body.is_visible === 'boolean' ? body.is_visible : true,
  }

  const { data, error } = await auth.supabaseAdmin
    .from('event_speakers')
    .insert(insertData)
    .select('*')
    .single()

  if (error) return jsonError(`Gagal menambah pembicara: ${error.message}`, 500)

  await writeAuditLog({
    actorProfileId: auth.userId,
    action: 'CREATE_EVENT_SPEAKER',
    entityType: 'event_speakers',
    entityId: data.id,
    metadata: { name: data.name, role: data.role },
    client: auth.supabaseAdmin,
  })

  return NextResponse.json({ success: true, message: 'Pembicara berhasil ditambahkan.', data })
}
