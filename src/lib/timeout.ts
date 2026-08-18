import { NextResponse } from 'next/server.js'

export const DEFAULT_READ_TIMEOUT_MS = 10000

/* eslint-disable @typescript-eslint/no-explicit-any */
export type RouteHandler<T = any> = (request: Request, context?: T) => Promise<Response | NextResponse>

/**
 * Global timeout and error handling wrapper for SAFE READ (GET) route handlers.
 * Prevents browser loading states from hanging indefinitely if database or network stalls.
 * MUST NOT be applied to mutation (POST/PATCH/PUT/DELETE) routes.
 */
export function withTimeoutGuard<T = any>(
  handler: RouteHandler<T>,
  timeoutMs: number = DEFAULT_READ_TIMEOUT_MS
): RouteHandler<T> {
  return async (request: Request, context?: T) => {
    let timer: NodeJS.Timeout | null = null

    const timeoutPromise = new Promise<Response>((resolve) => {
      timer = setTimeout(() => {
        resolve(
          NextResponse.json(
            {
              success: false,
              error: {
                code: 'REQUEST_TIMEOUT',
                message: `Permintaan pembacaan data melebihi batas waktu (timeout ${Math.round(timeoutMs / 1000)}s).`,
              },
            },
            { status: 408 }
          )
        )
      }, timeoutMs)
    })

    try {
      const response = await Promise.race([handler(request, context), timeoutPromise])
      return response
    } catch (err: any) {
      console.error('[TimeoutGuard] Read route exception:', err)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: err?.message || 'Terjadi kesalahan internal server.',
          },
        },
        { status: 500 }
      )
    } finally {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }
}
