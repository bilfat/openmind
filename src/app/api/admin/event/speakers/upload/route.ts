import { NextResponse } from 'next/server'
import { jsonError } from '@/lib/admin-read-auth'
import { requireEventSuperAdmin } from '@/lib/event-admin-auth'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// POST /api/admin/event/speakers/upload - Upload speaker photo to Supabase Storage
export async function POST(req: Request) {
  const auth = await requireEventSuperAdmin()
  if (!auth.authorized) return jsonError(auth.message, auth.status)

  let photoFile: File | null = null

  try {
    const formData = await req.formData()
    for (const [, value] of formData.entries()) {
      if (value instanceof File && value.size > 0) {
        photoFile = value
        break
      }
    }
  } catch {
    return jsonError('Payload request tidak valid.', 400)
  }

  if (!photoFile) {
    return jsonError('File foto tidak ditemukan.', 400)
  }

  // Validate file size
  if (photoFile.size > MAX_FILE_SIZE) {
    return jsonError('Ukuran file foto maksimal adalah 5MB.', 400)
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(photoFile.type)) {
    return jsonError('Tipe file foto harus berupa JPEG, PNG, atau WEBP.', 400)
  }

  try {
    const fileExt = photoFile.type.split('/')[1] || 'jpg'
    const fileName = `speaker-photos/speaker_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
    const buffer = Buffer.from(await photoFile.arrayBuffer())

    const { error: uploadError } = await auth.supabaseAdmin.storage
      .from('event-assets')
      .upload(fileName, buffer, { contentType: photoFile.type, upsert: true })

    if (uploadError) {
      return jsonError(`Gagal mengunggah foto: ${uploadError.message}`, 500)
    }

    const { data: publicUrlData } = auth.supabaseAdmin.storage
      .from('event-assets')
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      message: 'Foto berhasil diunggah.',
      url: publicUrlData.publicUrl,
      path: fileName,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonError(`Gagal mengunggah foto: ${message}`, 500)
  }
}
