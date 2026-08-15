import { TicketType, initialTicketTypes, TicketStatus } from "@/data/tickets";

const STORAGE_KEY = "open_mind_tickets_v2_2026";

export function generatePrivateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function getDerivedTicketStatus(ticket: TicketType): TicketStatus {
  if (ticket.status === "ARCHIVED" || ticket.status === "DRAFT" || ticket.status === "PAUSED") {
    return ticket.status;
  }

  // Check Sold Out
  if (ticket.issued >= ticket.quota) {
    return "SOLD_OUT";
  }

  // Check Sales Period
  if (ticket.salesEnd) {
    const end = new Date(ticket.salesEnd).getTime();
    if (!isNaN(end) && Date.now() > end) {
      return "EXPIRED";
    }
  }

  return "ACTIVE";
}

export function getStoredTickets(): TicketType[] {
  if (typeof window === "undefined") return initialTicketTypes;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialTicketTypes));
      return initialTicketTypes;
    }
    return JSON.parse(raw);
  } catch {
    return initialTicketTypes;
  }
}

export function saveTickets(tickets: TicketType[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

export function getTicketById(id: string): TicketType | null {
  const tickets = getStoredTickets();
  const cleanId = id.trim().toLowerCase();
  return tickets.find((t) => t.id.toLowerCase() === cleanId) || null;
}

export function getTicketByPrivateToken(token: string): TicketType | null {
  const tickets = getStoredTickets();
  const cleanToken = token.trim();
  return (
    tickets.find(
      (t) =>
        t.visibility === "PRIVATE" &&
        t.privateToken &&
        t.privateToken.toLowerCase() === cleanToken.toLowerCase()
    ) || null
  );
}

export function createNewTicket(
  data: Omit<TicketType, "id"> & { id?: string }
): TicketType {
  const tickets = getStoredTickets();
  const id =
    data.id ||
    data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") + `-${Date.now().toString().slice(-4)}`;

  const isPrivate = data.visibility === "PRIVATE";
  const newTicket: TicketType = {
    ...data,
    id,
    issued: data.issued || 0,
    privateToken: isPrivate ? data.privateToken || generatePrivateToken() : undefined,
  };

  const updated = [newTicket, ...tickets];
  saveTickets(updated);
  return newTicket;
}

export function updateExistingTicket(
  id: string,
  data: Partial<TicketType>
): TicketType | null {
  const tickets = getStoredTickets();
  const index = tickets.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const current = tickets[index];

  // If changing visibility to PRIVATE and didn't have token, generate one
  let privateToken = data.privateToken !== undefined ? data.privateToken : current.privateToken;
  if (data.visibility === "PRIVATE" && !privateToken) {
    privateToken = generatePrivateToken();
  }

  const updatedTicket: TicketType = {
    ...current,
    ...data,
    privateToken,
  };

  tickets[index] = updatedTicket;
  saveTickets(tickets);
  return updatedTicket;
}

export function duplicateTicket(id: string): TicketType | null {
  const source = getTicketById(id);
  if (!source) return null;

  const duplicated: TicketType = {
    ...source,
    id: `${source.id}-copy-${Date.now().toString().slice(-4)}`,
    name: `${source.name} (Copy)`,
    issued: 0,
    status: "DRAFT",
    privateToken: source.visibility === "PRIVATE" ? generatePrivateToken() : undefined,
  };

  const tickets = getStoredTickets();
  saveTickets([duplicated, ...tickets]);
  return duplicated;
}

export function setTicketStatus(id: string, status: TicketStatus): boolean {
  const tickets = getStoredTickets();
  const index = tickets.findIndex((t) => t.id === id);
  if (index === -1) return false;

  tickets[index].status = status;
  saveTickets(tickets);
  return true;
}

export function archiveTicket(id: string): boolean {
  return setTicketStatus(id, "ARCHIVED");
}

export function regeneratePrivateToken(id: string): string | null {
  const newToken = generatePrivateToken();
  const updated = updateExistingTicket(id, { privateToken: newToken });
  return updated ? newToken : null;
}

export function updateTicketIssuedCount(ticketId: string, count: number): boolean {
  const tickets = getStoredTickets();
  const index = tickets.findIndex((t) => t.id === ticketId);
  if (index === -1) return false;

  tickets[index].issued = Math.min(tickets[index].issued + count, tickets[index].quota);
  saveTickets(tickets);
  return true;
}
