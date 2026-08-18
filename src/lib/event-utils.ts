import type { EventConfig } from "./event-types";

const DAY_NAMES_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

export function isValidTimeString(value: string): boolean {
  if (typeof value !== "string") return false;
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
    const [h, m, s] = value.split(":").map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59 && s >= 0 && s <= 59;
  }
  if (/^\d{2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(":").map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }
  return false;
}

export function formatEventDate(value: string | null | undefined, long = true): string {
  if (!value) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return value;
  const [, y, mo, d] = m;
  const day = Number(d);
  const month = Number(mo);
  if (long) {
    return `${day} ${MONTH_NAMES_ID[month - 1] ?? mo} ${y}`;
  }
  const date = new Date(`${value}T00:00:00Z`);
  const dayName = DAY_NAMES_ID[date.getUTCDay()] ?? "";
  return `${dayName}, ${day} ${(MONTH_NAMES_ID[month - 1] ?? mo).slice(0, 3)} ${y}`;
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 5);
}

export function formatEventTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  const startFmt = formatTime(start);
  const endFmt = formatTime(end);
  if (!startFmt && !endFmt) return "";
  if (startFmt && endFmt) return `${startFmt} - ${endFmt} WIB`;
  return `${startFmt || endFmt} WIB`;
}

export function formatWhatsAppDisplay(value: string | null | undefined): string {
  if (!value) return "";
  if (value.startsWith("+")) return value;
  if (value.startsWith("62")) return `+${value.slice(0, 2)} ${value.slice(2, 4)}-${value.slice(4, 8)}-${value.slice(8)}`;
  if (value.startsWith("0")) {
    const local = value.slice(1);
    return `+62 ${local.slice(0, 2)}-${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return value;
}

export function waLink(number: string | null | undefined): string | null {
  if (!number) return null;
  const digits = number.replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) return `https://wa.me/62${digits.slice(1)}`;
  if (digits.startsWith("62")) return `https://wa.me/${digits}`;
  return `https://wa.me/${digits}`;
}

export function eventDisplayName(ev: Pick<EventConfig, "name" | "year"> | null | undefined): string {
  if (!ev?.name) return "OPEN MIND";
  return ev.year ? `${ev.name} ${ev.year}` : ev.name;
}

export function isValidUrl(value: string | null | undefined): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidWhatsApp(value: string | null | undefined): boolean {
  if (!value) return true;
  const digits = value.replace(/[^0-9]/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

// Parse event start time into a WIB-interpreted Date (event timezone is UTC+7).
export function getEventStartDate(event: Pick<EventConfig, "event_date" | "start_time"> | null | undefined): Date {
  const [y, mo, d] = (event?.event_date ?? "").split("-").map(Number);
  const time = isValidTimeString(event?.start_time ?? "") ? (event?.start_time as string) : "09:00";
  const [h, m] = time.split(":").map(Number);
  if (!y || !mo || !d || Number.isNaN(h) || Number.isNaN(m)) {
    return new Date("2026-09-18T09:00:00+07:00");
  }
  return new Date(Date.UTC(y, mo - 1, d, h - 7, m));
}

export function getEventEndDate(event: Pick<EventConfig, "event_date" | "end_time"> | null | undefined): Date {
  const [y, mo, d] = (event?.event_date ?? "").split("-").map(Number);
  const time = isValidTimeString(event?.end_time ?? "") ? (event?.end_time as string) : "17:00";
  const [h, m] = time.split(":").map(Number);
  if (!y || !mo || !d || Number.isNaN(h) || Number.isNaN(m)) {
    return new Date("2026-09-18T17:00:00+07:00");
  }
  return new Date(Date.UTC(y, mo - 1, d, h - 7, m));
}

export function toCalendarFormat(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function formatCheckInTime(isoString: string | null | undefined): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const formatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? "";
  const day = get("day");
  const month = get("month");
  const year = get("year");
  const hour = get("hour");
  const minute = get("minute");
  return `${day} ${month} ${year}, ${hour}:${minute} WIB`;
}

// Convert a live speaker row into the legacy TalentItem shape used by cards/modals.
export function speakerToTalent(speaker: {
  id: string;
  name: string;
  role: string;
  role_label?: string | null;
  position?: string | null;
  business?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  display_order: number;
}): {
  id: string;
  name: string;
  role: "speaker" | "moderator" | "mc";
  roleLabel: string;
  position: string;
  business: string;
  bio: string;
  image: string;
  instagram?: string;
  linkedin?: string;
  order: number;
} {
  const role = (speaker.role === "speaker" || speaker.role === "moderator" || speaker.role === "mc"
    ? speaker.role
    : "speaker") as "speaker" | "moderator" | "mc";
  const roleLabel =
    speaker.role_label ||
    (role === "speaker"
      ? "Speaker"
      : role === "moderator"
        ? "Moderator"
        : "Master of Ceremony");
  return {
    id: speaker.id,
    name: speaker.name,
    role,
    roleLabel,
    position: speaker.position ?? "",
    business: speaker.business ?? "",
    bio: speaker.bio ?? "",
    image: speaker.photo_url || "https://placehold.co/600x750?text=?",
    instagram: speaker.instagram || undefined,
    linkedin: speaker.linkedin || undefined,
    order: speaker.display_order,
  };
}
