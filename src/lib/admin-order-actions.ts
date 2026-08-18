export interface OrderTicketActionState {
  status: string
  issuedTicketCount: number
  hasTicketEmailJob: boolean
}

export const TICKET_ISSUABLE_STATUSES = ['APPROVED', 'TICKET_ISSUED'] as const

export function canDeliverTickets(state: Pick<OrderTicketActionState, 'status' | 'issuedTicketCount'>): boolean {
  return TICKET_ISSUABLE_STATUSES.includes(state.status as (typeof TICKET_ISSUABLE_STATUSES)[number]) && state.issuedTicketCount > 0
}

export function ticketEmailActionLabel(hasTicketEmailJob: boolean): string {
  return hasTicketEmailJob ? 'Kirim Ulang Tiket' : 'Kirim Tiket'
}

/**
 * Guards an async action against double submission for the same key.
 * Returns the action promise when the lock was acquired, or null when a
 * request is already in-flight for that key (double-click protection).
 */
export async function withActionLock<T>(locks: Set<string>, key: string, fn: () => Promise<T>): Promise<T> {
  if (locks.has(key)) return null as T
  locks.add(key)
  try {
    return await fn()
  } finally {
    locks.delete(key)
  }
}