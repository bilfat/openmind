import { createAdminClient } from '@/lib/supabase/admin'
import { SupabaseClient } from '@supabase/supabase-js'

export interface WriteAuditLogParams {
  actorProfileId: string | null
  action: string
  entityType: string
  entityId: string | null
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
  client?: SupabaseClient
}

/**
 * Business keys containing words like 'code', 'id', 'token', 'status' that MUST NOT be redacted.
 */
const BUSINESS_ALLOWED_KEYS = new Set([
  'ticket_code',
  'order_id',
  'participant_id',
  'event_id',
  'payment_id',
  'payment_method',
  'status',
  'broadcast_id',
  'check_in_id',
  'issued_ticket_id',
  'full_name',
  'email',
  'updated_fields',
  'has_new_poster',
  'method',
  'source',
])

/**
 * Exact or pattern sensitive key names that MUST be redacted.
 */
const SENSITIVE_EXACT_KEYS = new Set([
  'password',
  'encrypted_password',
  'access_token',
  'refresh_token',
  'api_key',
  'secret',
  'authorization',
  'credential',
  'credentials',
  'auth_token',
  'bearer_token',
  'client_secret',
  'service_role_key',
  'qr_token',
])

/**
 * Deterministic and recursive metadata sanitizer.
 * Strips secrets, passwords, tokens, credentials, and keys while keeping business fields intact.
 */
export function sanitizeMetadata(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeMetadata(item))
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase()

      // If key is explicitly allowed, do not redact
      if (BUSINESS_ALLOWED_KEYS.has(lowerKey)) {
        if (typeof value === 'object' && value !== null) {
          result[key] = sanitizeMetadata(value)
        } else {
          result[key] = value
        }
        continue
      }

      // Check sensitivity
      const isExactSensitive = SENSITIVE_EXACT_KEYS.has(lowerKey)
      const containsSensitiveTerm =
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('credential') ||
        (lowerKey.includes('token') && !lowerKey.endsWith('code')) ||
        (lowerKey.includes('key') && !lowerKey.includes('monkey'))

      if (isExactSensitive || containsSensitiveTerm) {
        result[key] = '[REDACTED]'
      } else if (typeof value === 'object' && value !== null) {
        result[key] = sanitizeMetadata(value)
      } else {
        result[key] = value
      }
    }
    return result
  }

  return data
}

/**
 * Central Audit Logging Service.
 * Writes a sanitized, append-only record to audit_logs table.
 * Throws on failure to enforce audit failure policy on calling route handlers.
 */
export async function writeAuditLog(params: WriteAuditLogParams): Promise<{ success: boolean; id: string }> {
  const supabase = params.client || createAdminClient()

  const rawMetadata = params.metadata || {}
  const sanitizedMetadata = (sanitizeMetadata(rawMetadata) as Record<string, unknown>) || {}

  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      actor_profile_id: params.actorProfileId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      metadata: sanitizedMetadata,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
    })
    .select('id')
    .single()

  if (error || !data) {
    const errorMsg = error?.message || 'Insert returned no data'
    console.error('Audit log insertion failed:', errorMsg)
    throw new Error(`Audit log insertion failed: ${errorMsg}`)
  }

  return { success: true, id: data.id }
}
