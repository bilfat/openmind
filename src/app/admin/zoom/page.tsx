"use client";

import React, { useState, useEffect } from "react";
import { Radio } from "lucide-react";
import { ZoomStatsCards } from "@/components/admin/zoom/zoom-stats-cards";
import { ZoomLinkConfig } from "@/components/admin/zoom/zoom-link-config";
import { ZoomSessionQR } from "@/components/admin/zoom/zoom-session-qr";
import { ZoomLiveMonitor } from "@/components/admin/zoom/zoom-live-monitor";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

function useZoomDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchDashboard() {
      try {
        const response = await fetch('/api/admin/zoom/dashboard');
        const payload = await response.json();
        if (payload.success && active) {
          setData(payload.data);
        }
      } catch (error) {
        console.error("Failed to fetch zoom dashboard", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchDashboard();
    
    // Polling every 60 seconds if tracking is enabled
    let interval: NodeJS.Timeout | null = null;
    if (!data || data.zoomLiveTrackingEnabled !== false) {
      interval = setInterval(fetchDashboard, 60000);
    }

    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [data?.zoomLiveTrackingEnabled]);

  return { data, loading };
}

export default function AdminZoomPage() {
  const { data, loading } = useZoomDashboard();
  const [role, setRole] = useState<string | null>(null);
  const isSuperAdmin = role === "SUPER_ADMIN";
  const canResetToken = role === "SUPER_ADMIN" || role === "ADMIN" || role === "STAFF";
  const supabase = createClient();

  useEffect(() => {
    async function fetchUserRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile) {
        setRole(profile.role);
      }
    }
    fetchUserRole();
  }, [supabase]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600 mb-2 border border-blue-500/20">
          <Radio className="h-3 w-3" />
          <span>ZOOM HYBRID</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-navy-900">
          Zoom Hybrid Management
        </h1>
        <p className="text-sm text-navy-900/70 mt-1">
          Monitor, konfigurasi, dan generate QR untuk akses Zoom online peserta.
        </p>
      </div>

      {/* Stats */}
      <ZoomStatsCards stats={data?.stats} loading={loading} />

      {/* Top Section: QR & Konfigurasi (bersebelahan pada PC) */}
      <div
        className={cn(
          "grid grid-cols-1 gap-6",
          role === "SUPER_ADMIN" ? "lg:grid-cols-2" : "grid-cols-1"
        )}
      >
        {/* Session QR */}
        <ZoomSessionQR
          sessionActive={data?.sessionActive}
          sessionExpiresAt={data?.sessionExpiresAt}
          zoomLinkReady={data?.zoomLinkReady}
          initialQrCodeUrl={data?.qrCodeDataUrl}
        />

        {/* Zoom Link Config — Super Admin Only */}
        {role === "SUPER_ADMIN" && (
          <ZoomLinkConfig
            zoomEnabled={data?.zoomEnabled}
            zoomLinkReady={data?.zoomLinkReady}
            zoomLinkUpdatedAt={data?.zoomLinkUpdatedAt}
            zoomMeetingLink={data?.zoomMeetingLink}
          />
        )}
      </div>

      {/* Bottom Section: Live Join Activity (Full Width) */}
      <ZoomLiveMonitor
        recentAccess={data?.recentAccess}
        isSuperAdmin={isSuperAdmin}
        canResetToken={canResetToken}
        zoomLiveTrackingEnabled={data?.zoomLiveTrackingEnabled}
      />
    </div>
  );
}
