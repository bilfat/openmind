export type TicketCategory = "FREE" | "PAID";
export type TicketVisibility = "PUBLIC" | "PRIVATE";
export type TicketStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "EXPIRED"
  | "SOLD_OUT"
  | "ARCHIVED";

export interface TicketType {
  id: string;
  name: string;
  description: string;
  type: TicketCategory;
  visibility: TicketVisibility;

  price: number;
  discountPercentage: number;
  finalPrice: number;

  quota: number;
  issued: number;

  minPurchase: number;
  maxPurchase: number;

  salesStart: string; // ISO string e.g. "2026-08-01T00:00"
  salesEnd: string; // ISO string e.g. "2026-09-17T23:59"

  status: TicketStatus;
  benefits: string[];

  privateToken?: string;
  badge?: string;
  colorAccent?: string;
}

// Backward compatibility alias for existing public pages
export type TicketItem = TicketType;

export const initialTicketTypes: TicketType[] = [
  {
    id: "free-pass",
    name: "FREE PASS",
    description: "Tiket pendaftaran gratis kuota terbatas untuk mahasiswa aktif Telkom University.",
    type: "FREE",
    visibility: "PUBLIC",
    price: 0,
    discountPercentage: 0,
    finalPrice: 0,
    quota: 100,
    issued: 88,
    minPurchase: 1,
    maxPurchase: 1,
    salesStart: "2026-08-01T00:00",
    salesEnd: "2026-09-10T23:59",
    status: "ACTIVE",
    badge: "Limited Quota",
    benefits: [
      "Access to Main Stage OPEN MIND 2026",
      "Official Digital E-Ticket & QR Pass",
      "General Seating Area",
      "E-Certificate of Participation",
      "Interactive Q&A Session",
    ],
  },
  {
    id: "early-bird",
    name: "EARLY BIRD",
    description: "Tiket harga spesial dengan diskon early bird dan jaminan tempat duduk baris depan.",
    type: "PAID",
    visibility: "PUBLIC",
    price: 75000,
    discountPercentage: 33.33,
    finalPrice: 50000,
    quota: 150,
    issued: 122,
    minPurchase: 1,
    maxPurchase: 5,
    salesStart: "2026-08-05T00:00",
    salesEnd: "2026-08-31T23:59",
    status: "ACTIVE",
    badge: "Best Seller",
    benefits: [
      "Semua Benefit Free Pass",
      "Priority Front-Row Seating Area",
      "Official Seminar Kit & Goodie Bag",
      "Exclusive Networking Lunch with HIPMI",
      "E-Certificate of Excellence",
    ],
  },
  {
    id: "regular-pass",
    name: "NORMAL PASS",
    description: "Tiket seminar reguler dengan akses penuh ke seluruh sesi pembicara dan expo wirausaha.",
    type: "PAID",
    visibility: "PUBLIC",
    price: 75000,
    discountPercentage: 0,
    finalPrice: 75000,
    quota: 200,
    issued: 45,
    minPurchase: 1,
    maxPurchase: 5,
    salesStart: "2026-08-15T00:00",
    salesEnd: "2026-09-17T23:59",
    status: "ACTIVE",
    badge: "Standard",
    benefits: [
      "Semua Benefit Free Pass",
      "Mid-Row Seating Area",
      "Official Notebook & Pen Set",
      "Access to Networking Lounge",
      "E-Certificate of Participation",
    ],
  },
  {
    id: "vip-invitation",
    name: "VIP INVITATION",
    description: "Tiket eksklusif khusus partner, delegasi, dan undangan khusus HIPMI PT Telkom University.",
    type: "PAID",
    visibility: "PRIVATE",
    price: 150000,
    discountPercentage: 33.33,
    finalPrice: 100000,
    quota: 30,
    issued: 18,
    minPurchase: 1,
    maxPurchase: 2,
    salesStart: "2026-08-01T00:00",
    salesEnd: "2026-09-17T23:59",
    status: "ACTIVE",
    badge: "Private VIP",
    privateToken: "X8K29LmQ",
    benefits: [
      "VIP Dedicated Front Table & Premium Lounge",
      "Exclusive 1-on-1 Mentoring Session",
      "Premium Merchandise & Plakat Eksklusif",
      "Private VIP Dinner with Keynote Speakers",
      "VIP Fast-Track Check-In & Certificate",
    ],
  },
  {
    id: "undangan-ormawa",
    name: "UNDANGAN ORMAWA TEL-U",
    description: "Tiket complimentary khusus untuk perwakilan pimpinan organisasi mahasiswa dan BEM Telkom University.",
    type: "FREE",
    visibility: "PRIVATE",
    price: 0,
    discountPercentage: 0,
    finalPrice: 0,
    quota: 25,
    issued: 14,
    minPurchase: 1,
    maxPurchase: 1,
    salesStart: "2026-08-01T00:00",
    salesEnd: "2026-09-15T23:59",
    status: "ACTIVE",
    badge: "Delegasi",
    privateToken: "OrmawaTelU26",
    benefits: [
      "Complimentary Delegate Pass",
      "Ormawa Reserved Seating",
      "Official Delegate Seminar Kit",
      "Special E-Certificate for Ormawa",
    ],
  },
];

// Helper export
export const mockTickets = initialTicketTypes;
