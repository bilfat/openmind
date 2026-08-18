export type EventStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type EventConfig = {
  id: string;
  name: string;
  slug: string;
  year: string | null;
  theme: string;
  tagline: string | null;
  description: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  address: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  poster_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  hipmi_instagram_url: string | null;
  hipmi_tiktok_url: string | null;
  contact_whatsapp: string | null;
  contact_whatsapp_display: string | null;
  contact_email: string | null;
  whatsapp_group_url: string | null;
  qris_image_url: string | null;
  status: EventStatus;
  created_at?: string;
  updated_at?: string;
};

export type EventSpeaker = {
  id: string;
  event_id: string;
  name: string;
  role: "speaker" | "moderator" | "mc" | string;
  role_label: string | null;
  position: string | null;
  business: string | null;
  bio: string | null;
  photo_url: string | null;
  instagram: string | null;
  linkedin: string | null;
  display_order: number;
  is_visible: boolean;
};

export type EventAgendaItem = {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  speaker_id: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  session_order: number;
  is_visible: boolean;
};

export type ActiveEventPayload = {
  event: EventConfig;
  speakers: EventSpeaker[];
  agenda: EventAgendaItem[];
};

export type EventSpeakerInput = {
  name: string;
  role: string;
  role_label?: string | null;
  position?: string | null;
  business?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  display_order?: number;
  is_visible?: boolean;
};

export type EventAgendaInput = {
  title: string;
  description?: string | null;
  speaker_id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  session_order?: number;
  is_visible?: boolean;
};
