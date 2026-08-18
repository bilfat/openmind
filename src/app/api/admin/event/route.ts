import { NextResponse } from 'next/server'
import { requireActiveAdmin, jsonError } from '@/lib/admin-read-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeAuditLog } from '@/lib/audit'

const ALLOWED_FIELDS = [
  'name',
  'slug',
  'year',
  'theme',
  'tagline',
  'description',
  'event_date',
  'start_time',
  'end_time',
  'venue',
  'address',
  'hero_title',
  'hero_subtitle',
  'poster_url',
  'instagram_url',
  'tiktok_url',
  'hipmi_instagram_url',
  'hipmi_tiktok_url',
  'contact_whatsapp',
  'contact_whatsapp_display',
  'contact_email',
  'whatsapp_group_url',
  'qris_image_url',
  'status',
] as const

const MAX_FIELD_LENGTHS: Record<string, number> = {
  name: 120,
  slug: 120,
  year: 8,
  theme: 200,
  tagline: 300,
  description: 4000,
  venue: 300,
  address: 500,
  hero_title: 300,
  hero_subtitle: 500,
  instagram_url: 500,
  tiktok_url: 500,
  hipmi_instagram_url: 500,
  hipmi_tiktok_url: 500,
  contact_whatsapp: 20,
  contact_whatsapp_display: 40,
  contact_email: 320,
  whatsapp_group_url: 500,
  poster_url: 1000,
  qris_image_url: 1000,
}

const URL_FIELDS = ['instagram_url', 'tiktok_url', 'hipmi_instagram_url', 'hipmi_tiktok_url', 'poster_url', 'qris_image_url', 'whatsapp_group_url'] as const

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

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
      message: 'Forbidden: Hanya Super Admin yang dapat mengelola pengaturan event.',
    }
  }

  return { authorized: true as const, supabaseAdmin, userId: authResult.userId }
}

// Helper to extract bucket path from public URL
function getStoragePathFromUrl(url: string, bucketName: string): string | null {
  if (!url || typeof url !== 'string') return null
  const marker = `/storage/v1/object/public/${bucketName}/`
  const index = url.indexOf(marker)
  if (index !== -1) {
    return url.substring(index + marker.length)
  }
  return null
}

// GET /api/admin/event - Retrieve current event details
export async function GET() {
  const auth = await requireSuperAdmin()
  if (!auth.authorized) {
    return jsonError(auth.message, auth.status)
  }

  try {
    const { data: event, error } = await auth.supabaseAdmin
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return jsonError(`Gagal mengambil data event: ${error.message}`, 500)
    }

    if (!event) {
      return jsonError('Event tidak ditemukan.', 404)
    }

    return NextResponse.json({
      success: true,
      data: event,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonError(`Server error: ${message}`, 500)
  }
}

// PATCH /api/admin/event - Update active event details & upload poster/QRIS assets
export async function PATCH(req: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.authorized) {
    return jsonError(auth.message, auth.status)
  }

  let bodyData: Record<string, unknown> = {}
  let posterFile: File | null = null
  let qrisFile: File | null = null

  const contentType = req.headers.get('content-type') || ''

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      for (const [key, value] of formData.entries()) {
        if (key === 'poster' || key === 'file') {
          if (value instanceof File && value.size > 0) {
            posterFile = value
          }
        } else if (key === 'qris_image') {
          if (value instanceof File && value.size > 0) {
            qrisFile = value
          }
        } else {
          bodyData[key] = value
        }
      }
    } else {
      bodyData = (await req.json()) as Record<string, unknown>
    }
  } catch {
    return jsonError('Payload request tidak valid.', 400)
  }

  // 1. Filter disallowed fields & construct update object
  const updates: Record<string, unknown> = {}
  for (const field of ALLOWED_FIELDS) {
    if (field in bodyData) {
      updates[field] = bodyData[field]
    }
  }

  // 2. Fetch target event record
  const { data: currentEvent, error: fetchError } = await auth.supabaseAdmin
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchError || !currentEvent) {
    return jsonError('Data event sasaran tidak ditemukan.', 404)
  }

  // 3. Validation Logic
  // Max length validation
  for (const [field, value] of Object.entries(updates)) {
    if (value === null || value === undefined) continue
    const maxLen = MAX_FIELD_LENGTHS[field]
    if (maxLen !== undefined && typeof value === 'string' && value.length > maxLen) {
      return jsonError(`Field ${field} melebihi batas maksimal ${maxLen} karakter.`, 400)
    }
  }

  // URL validation
  for (const field of URL_FIELDS) {
    const value = updates[field]
    if (typeof value === 'string' && value.trim() !== '') {
      let parsed: URL
      try {
        parsed = new URL(value)
      } catch {
        return jsonError(`Field ${field} bukan URL yang valid.`, 400)
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return jsonError(`Field ${field} harus menggunakan protokol http/https.`, 400)
      }
    }
  }

  // Date validation
  if (updates.event_date !== undefined) {
    if (typeof updates.event_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(updates.event_date)) {
      return jsonError('Format event_date tidak valid. Harus format YYYY-MM-DD.', 400)
    }
    const d = new Date(updates.event_date)
    if (isNaN(d.getTime())) {
      return jsonError('Nilai event_date bukan tanggal yang valid.', 400)
    }
  }

  // Year validation
  if (updates.year !== undefined && updates.year !== null) {
    if (typeof updates.year !== 'string' || !/^\d{4}$/.test(updates.year)) {
      return jsonError('Format year tidak valid. Harus 4 digit angka (contoh: 2026).', 400)
    }
  }

  // WhatsApp validation
  if (updates.contact_whatsapp !== undefined && updates.contact_whatsapp !== null) {
    if (typeof updates.contact_whatsapp !== 'string') {
      return jsonError('Nomor WhatsApp tidak valid.', 400)
    }
    const digits = updates.contact_whatsapp.replace(/[^0-9]/g, '')
    if (digits.length < 9 || digits.length > 15) {
      return jsonError('Nomor WhatsApp harus berupa 9-15 digit angka.', 400)
    }
  }

  // Email validation
  if (updates.contact_email !== undefined && updates.contact_email !== null) {
    if (typeof updates.contact_email !== 'string') {
      return jsonError('Format contact_email tidak valid.', 400)
    }
    const email = updates.contact_email.trim()
    if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError('Format contact_email tidak valid.', 400)
    }
  }

  // Time validation
  const targetStartTime = updates.start_time !== undefined ? updates.start_time : currentEvent.start_time
  const targetEndTime = updates.end_time !== undefined ? updates.end_time : currentEvent.end_time

  if (updates.start_time !== undefined && updates.start_time !== null) {
    if (typeof updates.start_time !== 'string' || !/^\d{2}:\d{2}(:\d{2})?$/.test(updates.start_time)) {
      return jsonError('Format start_time tidak valid. Harus format HH:mm atau HH:mm:ss.', 400)
    }
  }

  if (updates.end_time !== undefined && updates.end_time !== null) {
    if (typeof updates.end_time !== 'string' || !/^\d{2}:\d{2}(:\d{2})?$/.test(updates.end_time)) {
      return jsonError('Format end_time tidak valid. Harus format HH:mm atau HH:mm:ss.', 400)
    }
  }

  if (targetStartTime && targetEndTime) {
    const startSec = parseTimeToSeconds(targetStartTime)
    const endSec = parseTimeToSeconds(targetEndTime)
    if (startSec !== null && endSec !== null && endSec <= startSec) {
      return jsonError('end_time harus lebih besar (setelah) start_time.', 400)
    }
  }

  // Status validation
  if (updates.status !== undefined) {
    const validStatuses = ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']
    if (typeof updates.status !== 'string' || !validStatuses.includes(updates.status)) {
      return jsonError('Nilai status event tidak valid.', 400)
    }
  }

  // 4. Handle Poster Upload if file provided
  let uploadedFilePath: string | null = null

  if (posterFile) {
    if (posterFile.size > MAX_FILE_SIZE) {
      return jsonError('Ukuran file poster maksimal adalah 5MB.', 400)
    }
    if (!ALLOWED_MIME_TYPES.includes(posterFile.type)) {
      return jsonError('Tipe file poster harus berupa JPEG, PNG, atau WEBP.', 400)
    }

    const fileExt = posterFile.type.split('/')[1] || 'jpg'
    const fileName = `posters/poster_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
    const buffer = Buffer.from(await posterFile.arrayBuffer())

    const { error: uploadError } = await auth.supabaseAdmin.storage
      .from('event-assets')
      .upload(fileName, buffer, { contentType: posterFile.type, upsert: true })

    if (uploadError) {
      return jsonError(`Gagal mengunggah file poster: ${uploadError.message}`, 500)
    }

    uploadedFilePath = fileName
    const { data: publicUrlData } = auth.supabaseAdmin.storage.from('event-assets').getPublicUrl(fileName)
    updates.poster_url = publicUrlData.publicUrl
  }

  // 4b. Handle QRIS Image Upload if file provided
  let uploadedQrisPath: string | null = null

  if (qrisFile) {
    if (qrisFile.size > MAX_FILE_SIZE) {
      return jsonError('Ukuran file QRIS maksimal adalah 5MB.', 400)
    }
    if (!ALLOWED_MIME_TYPES.includes(qrisFile.type)) {
      return jsonError('Tipe file QRIS harus berupa JPEG, PNG, atau WEBP.', 400)
    }

    const qrisExt = qrisFile.type.split('/')[1] || 'jpg'
    const qrisFileName = `qris/qris_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${qrisExt}`
    const qrisBuffer = Buffer.from(await qrisFile.arrayBuffer())

    const { error: qrisUploadError } = await auth.supabaseAdmin.storage
      .from('event-assets')
      .upload(qrisFileName, qrisBuffer, { contentType: qrisFile.type, upsert: true })

    if (qrisUploadError) {
      return jsonError(`Gagal mengunggah file QRIS: ${qrisUploadError.message}`, 500)
    }

    uploadedQrisPath = qrisFileName
    const { data: qrisPublicUrlData } = auth.supabaseAdmin.storage.from('event-assets').getPublicUrl(qrisFileName)
    updates.qris_image_url = qrisPublicUrlData.publicUrl
  }

  if (Object.keys(updates).length === 0 && !uploadedFilePath && !uploadedQrisPath) {
    return jsonError('Tidak ada field valid yang diperbarui.', 400)
  }

  updates.updated_at = new Date().toISOString()

  // 5. Update Database Record with Compensating Cleanup
  const { data: updatedEvent, error: updateError } = await auth.supabaseAdmin
    .from('events')
    .update(updates)
    .eq('id', currentEvent.id)
    .select('*')
    .single()

  if (updateError || !updatedEvent) {
    // COMPENSATING CLEANUP: If DB update fails, delete newly uploaded files
    const cleanupPaths: string[] = []
    if (uploadedFilePath) cleanupPaths.push(uploadedFilePath)
    if (uploadedQrisPath) cleanupPaths.push(uploadedQrisPath)
    if (cleanupPaths.length > 0) {
      console.error('Database update failed, performing compensating cleanup:', cleanupPaths)
      await auth.supabaseAdmin.storage.from('event-assets').remove(cleanupPaths)
    }
    return jsonError(`Gagal memperbarui data event di database: ${updateError?.message || 'Unknown error'}`, 500)
  }

  // 6. Cleanup previous poster asset if a new poster was successfully uploaded
  if (uploadedFilePath && currentEvent.poster_url) {
    const oldPath = getStoragePathFromUrl(currentEvent.poster_url, 'event-assets')
    if (oldPath && oldPath !== uploadedFilePath) {
      auth.supabaseAdmin.storage.from('event-assets').remove([oldPath]).catch((err) => {
        console.warn('Gagal menghapus poster lama dari storage:', err)
      })
    }
  }

  // 6b. Cleanup previous QRIS asset if a new QRIS was successfully uploaded
  if (uploadedQrisPath && currentEvent.qris_image_url) {
    const oldQrisPath = getStoragePathFromUrl(currentEvent.qris_image_url, 'event-assets')
    if (oldQrisPath && oldQrisPath !== uploadedQrisPath) {
      auth.supabaseAdmin.storage.from('event-assets').remove([oldQrisPath]).catch((err) => {
        console.warn('Gagal menghapus QRIS lama dari storage:', err)
      })
    }
  }

  // 7. Central Audit Logging Service (Phase 21)
  await writeAuditLog({
    actorProfileId: auth.userId,
    action: 'UPDATE_EVENT_SETTINGS',
    entityType: 'events',
    entityId: updatedEvent.id,
    metadata: {
      updated_fields: Object.keys(updates),
      has_new_poster: !!uploadedFilePath,
      has_new_qris: !!uploadedQrisPath,
    },
    client: auth.supabaseAdmin,
  })

  return NextResponse.json({
    success: true,
    message: 'Pengaturan event berhasil diperbarui.',
    data: updatedEvent,
  })
}

function parseTimeToSeconds(timeStr: string): number | null {
  const parts = timeStr.split(':')
  if (parts.length < 2) return null
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  const s = parts[2] ? parseInt(parts[2], 10) : 0
  if (isNaN(h) || isNaN(m) || isNaN(s)) return null
  return h * 3600 + m * 60 + s
}
