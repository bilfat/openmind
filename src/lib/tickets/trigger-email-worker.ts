/**
 * Fires the EXISTING email worker endpoint once so freshly queued email_jobs
 * are claimed and sent immediately, instead of waiting for an external cron.
 * This is the same worker that already owns CLAIM → PROCESS → SEND → status.
 * Best-effort: on failure the jobs stay PENDING and any scheduled trigger
 * (or the next manual run) still delivers them.
 */
export async function triggerEmailWorker(origin: string): Promise<void> {
  const secret = process.env.EMAIL_WORKER_SECRET
  if (!secret) return
  try {
    const response = await fetch(`${origin.replace(/\/+$/, '')}/api/jobs/email-worker`, {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}` },
      cache: 'no-store',
    })
    if (!response.ok) {
      console.error(`Email worker trigger failed with HTTP ${response.status}`)
    }
  } catch (error) {
    console.error('Email worker trigger failed:', error instanceof Error ? error.message : error)
  }
}