import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { EventConfig, EventSpeaker, EventAgendaItem } from "./event-types";

export type ActiveEventServerResult = {
  event: EventConfig | null;
  speakers: EventSpeaker[];
  agenda: EventAgendaItem[];
};

export async function fetchActiveEventServer(): Promise<ActiveEventServerResult> {
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (error || !event) {
    return { event: null, speakers: [], agenda: [] };
  }

  const [speakersResult, agendaResult] = await Promise.all([
    supabase
      .from("event_speakers")
      .select("*")
      .eq("event_id", event.id)
      .eq("is_visible", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("event_agenda")
      .select("*")
      .eq("event_id", event.id)
      .eq("is_visible", true)
      .order("session_order", { ascending: true }),
  ]);

  return {
    event: event as EventConfig,
    speakers: (speakersResult.data ?? []) as EventSpeaker[],
    agenda: (agendaResult.data ?? []) as EventAgendaItem[],
  };
}
