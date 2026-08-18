"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { ActiveEventPayload, EventConfig, EventSpeaker, EventAgendaItem } from "@/lib/event-types";

type ActiveEventState = {
  event: EventConfig | null;
  speakers: EventSpeaker[];
  agenda: EventAgendaItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const ActiveEventContext = createContext<ActiveEventState>({
  event: null,
  speakers: [],
  agenda: [],
  loading: true,
  error: null,
  refetch: async () => {},
});

// sharedCache is a module-level variable scoped to the current browser tab.
// Under Next.js, each open tab has its own distinct JavaScript environment.
// Therefore:
// 1. Same-tab mutations: calling refetch() will invalidate this tab's cache and notify all providers.
// 2. Cross-tab mutations: saving in Tab A (Admin) will NOT automatically update Tab B (Guest),
//    unless Tab B is manually refreshed or navigated. This is the expected behavior of this cache design.
let sharedCache: ActiveEventPayload | null = null;

// BroadcastChannel for same-tab synchronization across multiple ActiveEventProvider instances
const broadcastChannel = typeof window !== "undefined" ? new BroadcastChannel("active-event-sync") : null;

export function ActiveEventProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<ActiveEventState, "refetch">>({
    event: sharedCache?.event ?? null,
    speakers: sharedCache?.speakers ?? [],
    agenda: sharedCache?.agenda ?? [],
    loading: !sharedCache,
    error: null,
  });

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/events/active", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat data event.");
      }
      sharedCache = json.data;
      setState({ event: json.data.event, speakers: json.data.speakers, agenda: json.data.agenda, loading: false, error: null });
      // Notify other providers in the same tab
      broadcastChannel?.postMessage({ type: "REFRESH" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal memuat data event.";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  // Listen for refresh messages from other providers in the same tab
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "REFRESH") {
        // Re-read sharedCache and update state
        if (sharedCache) {
          setState({
            event: sharedCache.event,
            speakers: sharedCache.speakers,
            agenda: sharedCache.agenda,
            loading: false,
            error: null,
          });
        }
      }
    };

    broadcastChannel?.addEventListener("message", handleMessage);
    return () => broadcastChannel?.removeEventListener("message", handleMessage);
  }, []);

  // Initial fetch if no cache
  useEffect(() => {
    if (!sharedCache) refetch();
  }, [refetch]);

  return (
    <ActiveEventContext.Provider value={{ ...state, refetch }}>
      {children}
    </ActiveEventContext.Provider>
  );
}

export function useActiveEvent() {
  return useContext(ActiveEventContext);
}
