"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import { createBrowserClient } from "@supabase/ssr";
import {
  ScanLine,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  UserCheck,
  Camera,
  Loader2,
  Volume2,
  VolumeX,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

interface CheckInStats {
  totalParticipants: number;
  totalCheckedIn: number;
  remainingParticipants: number;
  attendancePercentage: number;
}

// Map API response (totalIssued, totalCheckedIn, attendanceRate) to frontend interface
const mapStatsApiResponse = (apiData: {
  totalIssued: number;
  totalCheckedIn: number;
  attendanceRate: number;
}): CheckInStats => ({
  totalParticipants: apiData.totalIssued,
  totalCheckedIn: apiData.totalCheckedIn,
  remainingParticipants: apiData.totalIssued > 0 ? apiData.totalIssued - apiData.totalCheckedIn : 0,
  attendancePercentage: apiData.attendanceRate,
});

interface ScanResponseTicket {
  ticketCode: string;
  qrToken: string;
  ticketTypeName: string;
  participant: {
    fullName: string;
    email: string;
    whatsapp: string;
    nim: string;
    faculty: string;
  };
  order: {
    orderCode: string;
  };
}

interface OrderCheckInTicket {
  ticketId: string;
  ticketCode: string;
  participantName: string;
  ticketTypeName: string;
  alreadyCheckedIn: boolean;
  checkedInAt?: string | null;
}

interface ScanResponseData {
  checkInId?: string;
  checkedInAt?: string;
  checkedInBy?: string;
  operatorName?: string;
  method?: string;
  ticket?: ScanResponseTicket;
  orderCode?: string;
  checkedInCount?: number;
  alreadyCheckedInCount?: number;
  tickets?: OrderCheckInTicket[];
}

type ScanStatus =
  | "SUCCESS"
  | "ALREADY_CHECKED_IN"
  | "NOT_FOUND"
  | "TICKET_CANCELLED"
  | "ERROR";

const LIST_PAGE_SIZE = 10;

type ParticipantRow = {
  id: string;
  ticketCode: string;
  status: string;
  issuedAt: string;
  participant: { id: string; full_name: string; nim: string; faculty: string; email: string } | null;
  order: { order_code: string } | null;
  ticketTypeName: string;
  checkIn: { id: string; checked_in_at: string; method: string; checked_in_by: string | null; profiles?: { full_name: string; role: string } | null } | null;
  isCheckedIn: boolean;
};

export default function AdminCheckInPage() {
  const [stats, setStats] = useState<CheckInStats>({
    totalParticipants: 0,
    totalCheckedIn: 0,
    remainingParticipants: 0,
    attendancePercentage: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Manual Input State
  const [manualInput, setManualInput] = useState("");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Camera & Scanner State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Result Banner State
  const [scanResult, setScanResult] = useState<{
    status: ScanStatus;
    message: string;
    data?: ScanResponseData;
  } | null>(null);

  // Success Popup Modal State (shown when a check-in succeeds)
  const [scanPopup, setScanPopup] = useState<{
    message: string;
    data?: ScanResponseData;
  } | null>(null);
  const scanPopupTimerRef = useRef<number | null>(null);

  const closeScanPopup = useCallback(() => {
    setScanPopup(null);
    if (scanPopupTimerRef.current) {
      clearTimeout(scanPopupTimerRef.current);
      scanPopupTimerRef.current = null;
    }
  }, []);

  // Participant List State (pagination + integrated data)
  const [listItems, setListItems] = useState<ParticipantRow[]>([]);
  const [listStatus, setListStatus] = useState<"ALL" | "CHECKED_IN" | "NOT_PRESENT">("ALL");
  const [listSearch, setListSearch] = useState("");
  const [listPage, setListPage] = useState(1);
  const [listPagination, setListPagination] = useState({ page: 1, limit: LIST_PAGE_SIZE, total: 0, totalPages: 0 });
  const [listLoading, setListLoading] = useState(true);
  const [listRefreshTick, setListRefreshTick] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const isProcessingScanRef = useRef(false);
  const cameraActiveRef = useRef(false);
  const lastScanTimeRef = useRef(0);
  const submitCheckInRef = useRef<(identifier: string, method: "QR_SCAN" | "MANUAL") => Promise<void>>(async () => {});

  // Keep refs in sync so the long-running scan interval never uses stale closures
  useEffect(() => {
    cameraActiveRef.current = cameraActive;
  }, [cameraActive]);

  // Initialize Supabase Client for Realtime Subscription
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch Attendance Stats - called on mount and via realtime
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/check-in/stats");
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setStats(mapStatsApiResponse(json.data));
      }
    } catch (err) {
      console.error("Gagal memuat statistik check-in:", err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch paginated participant list
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(
      () => {
        setListLoading(true);
        const params = new URLSearchParams({ page: String(listPage), limit: String(LIST_PAGE_SIZE) });
        if (listStatus !== "ALL") params.set("status", listStatus);
        if (listSearch.trim()) params.set("search", listSearch.trim());
        fetch(`/api/admin/check-in/participants?${params.toString()}`, { cache: "no-store" })
          .then(async (res) => {
            const json = await res.json();
            if (cancelled) return;
            if (res.ok && json.success) {
              setListItems(json.items ?? []);
              const pagination = json.pagination ?? { page: 1, limit: LIST_PAGE_SIZE, total: 0, totalPages: 0 };
              setListPagination(pagination);
              if (pagination.totalPages > 0 && listPage > pagination.totalPages) {
                setListPage(pagination.totalPages);
              }
            }
          })
          .catch((err) => {
            if (!cancelled) console.error("Gagal memuat daftar peserta:", err);
          })
          .finally(() => {
            if (!cancelled) setListLoading(false);
          });
      },
      listSearch.trim() ? 350 : 0
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [listPage, listStatus, listSearch, listRefreshTick]);

  // Initial statistics fetch on page mount + realtime subscription
  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/check-in/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Stats fetch failed");
        return res.json();
      })
      .then((json) => {
        if (mounted && json.success && json.data) {
          setStats(mapStatsApiResponse(json.data));
        }
      })
      .catch((err) => {
        console.error("Gagal memuat statistik check-in:", err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Subscribe to Supabase Realtime channel on check_ins table
  // (statistics & participant list updates come through this channel)
  useEffect(() => {
    let mounted = true;
    const channel = supabase
      .channel("check_ins_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "check_ins" },
        () => {
          if (mounted) {
            fetchStats();
            setListRefreshTick((t) => t + 1);
          }
        }
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchStats]);

  // Play Audio Beep Feedback
  const playBeep = (success: boolean) => {
    if (!audioEnabled || typeof window === "undefined") return;
    try {
      const ctx = new (window.AudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (success) {
        // Two-tone success chime: brighter and longer so it's clearly audible
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.frequency.setValueAtTime(990, ctx.currentTime + 0.18);
        gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.18);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.18);
        osc2.stop(ctx.currentTime + 0.48);
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio context might be blocked by browser autoplay policy
    }
  };

  // Normalize QR payload: extract qr_token from full URL if needed
  const normalizeQrIdentifier = (raw: string): string => {
    const trimmed = raw.trim();
    // If it looks like a full URL, extract the token from the path
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      try {
        const url = new URL(trimmed);
        const pathParts = url.pathname.split("/").filter((p) => p.length > 0);
        // Expected pattern: /ticket/[qr_token] or just the token at the end
        const potentialToken = pathParts[pathParts.length - 1];
        if (potentialToken && potentialToken.length > 0) {
          return potentialToken;
        }
      } catch {
        // Invalid URL, fall through to raw value
      }
    }
    return trimmed;
  };

  // Submit Scan Payload to API
  const submitCheckIn = async (identifier: string, method: "QR_SCAN" | "MANUAL") => {
    if (!identifier.trim()) return;

    const now = Date.now();
    if (now - lastScanTimeRef.current < 2000) {
      // Brief debounce - prevent same QR spam within 2 seconds
      return;
    }

    try {
      const res = await fetch("/api/admin/check-in/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: normalizeQrIdentifier(identifier).trim(), method }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        playBeep(true);
        setScanResult({
          status: "SUCCESS",
          message: json.message || "Check-in Berhasil!",
          data: json.data,
        });
        // Open the success popup so the admin can clearly see + hear the result
        setScanPopup({
          message: json.message || "Check-in Berhasil!",
          data: json.data,
        });
        if (scanPopupTimerRef.current) {
          clearTimeout(scanPopupTimerRef.current);
        }
        scanPopupTimerRef.current = window.setTimeout(() => {
          setScanPopup(null);
          scanPopupTimerRef.current = null;
        }, 3500);
        lastScanTimeRef.current = now;
        fetchStats();
        setListRefreshTick((t) => t + 1);
      } else if (res.status === 409) {
        playBeep(false);
        setScanResult({
          status: "ALREADY_CHECKED_IN",
          message: json.message || "Peserta ini sudah melakukan check-in sebelumnya.",
          data: json.data,
        });
        lastScanTimeRef.current = now;
        setListRefreshTick((t) => t + 1);
      } else if (res.status === 404) {
        playBeep(false);
        setScanResult({
          status: "NOT_FOUND",
          message: json.message || "Tiket tidak ditemukan di database.",
        });
        lastScanTimeRef.current = now;
      } else if (res.status === 400 && json.status === "TICKET_CANCELLED") {
        playBeep(false);
        setScanResult({
          status: "TICKET_CANCELLED",
          message: json.message || "Tiket ini telah dibatalkan dan tidak berlaku.",
        });
        lastScanTimeRef.current = now;
      } else {
        playBeep(false);
        setScanResult({
          status: "ERROR",
          message: json.message || "Terjadi kesalahan saat memproses check-in.",
        });
        lastScanTimeRef.current = now;
      }
    } catch (err: unknown) {
      playBeep(false);
      setScanResult({
        status: "ERROR",
        message: (err instanceof Error ? err.message : String(err)) || "Terjadi kesalahan koneksi jaringan.",
      });
      lastScanTimeRef.current = now;
    }
  };

  // Keep the ref pointing at the latest submitCheckIn so the long-running
  // scan interval never calls a stale closure
  useEffect(() => {
    submitCheckInRef.current = submitCheckIn;
  });

  // Manual Input Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    setIsSubmittingManual(true);
    await submitCheckIn(manualInput.trim(), "MANUAL");
    setIsSubmittingManual(false);
    setManualInput("");
  };

  // Camera Control
  const startCamera = async (requestedMode: "environment" | "user" = facingMode) => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: requestedMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setFacingMode(requestedMode);
        setCameraActive(true);
      }
    } catch (err: unknown) {
      console.error("Camera access error:", err);
      // Try fallback with the opposite camera
      const fallbackMode = requestedMode === "environment" ? "user" : "environment";
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: fallbackMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play();
          setFacingMode(fallbackMode);
          setCameraActive(true);
          setCameraError(
            `Kamera ${requestedMode === "environment" ? "belakang" : "depan"} tidak tersedia, menggunakan kamera ${fallbackMode === "environment" ? "belakang" : "depan"}.`
          );
        }
      } catch {
        setCameraActive(false);
        setCameraError(
          "Kamera tidak dapat diakses. Izinkan akses kamera di browser."
        );
      }
    }
  };

  // Toggle between front (user) and back (environment) camera
  const handleFlipCamera = () => {
    if (!cameraActive) return;
    const nextMode = facingMode === "environment" ? "user" : "environment";
    stopCamera();
    void startCamera(nextMode);
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // QR Scanning Loop - runs at ~5fps with cropped region for reliability, accounting for object-cover
  const scanningLoopRef = useRef({
    start: () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      scanIntervalRef.current = window.setInterval(() => {
        if (!cameraActiveRef.current || isProcessingScanRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas || video.readyState < video.HAVE_METADATA) return;

        // Get real video dimensions (NOT CSS dimensions)
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        if (videoWidth <= 0 || videoHeight <= 0) return;

        const container = video.parentElement;
        const containerWidth = container?.clientWidth || videoWidth;
        const containerHeight = container?.clientHeight || videoHeight;

        // Compute the exact sub-rectangle of the video that is visible in the
        // container (object-cover crop), in video source pixel coordinates.
        const coverScale = Math.max(containerWidth / videoWidth, containerHeight / videoHeight);
        const srcW = containerWidth / coverScale;
        const srcH = containerHeight / coverScale;
        const srcX = (videoWidth - srcW) / 2;
        const srcY = (videoHeight - srcH) / 2;

        // Fixed canvas resolution, aspect matched to the container so the canvas
        // content is pixel-identical to what the user sees in the video element.
        const canvasW = 640;
        const canvasH = Math.max(1, Math.round(640 * (containerHeight / containerWidth)));
        if (canvas.width !== canvasW) canvas.width = canvasW;
        if (canvas.height !== canvasH) canvas.height = canvasH;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        // Draw the visible crop into the canvas (no distortion, exact match to display)
        ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, canvasW, canvasH);

        // Center scan box that matches the visual frame in the UI:
        // same size formula -> min(45% of width, 360px)
        const visualBoxSize = Math.min(containerWidth * 0.45, 360);
        const boxSize = Math.max(1, Math.round(canvasW * (visualBoxSize / containerWidth)));
        const boxX = Math.round((canvasW - boxSize) / 2);
        const boxY = Math.round((canvasH - boxSize) / 2);

        let code: { data: string } | null = null;
        try {
          const boxData = ctx.getImageData(boxX, boxY, boxSize, boxSize);
          code = jsQR(boxData.data, boxSize, boxSize, { inversionAttempts: "dontInvert" });

          // Fallback: scan the full frame if the QR is slightly outside the center box
          if (!code) {
            const fullData = ctx.getImageData(0, 0, canvasW, canvasH);
            code = jsQR(fullData.data, canvasW, canvasH, { inversionAttempts: "dontInvert" });
          }
        } catch {
          // getImageData can throw if the rect is out of bounds; skip this frame
          return;
        }

        if (code && code.data && !isProcessingScanRef.current) {
          isProcessingScanRef.current = true;
          submitCheckInRef.current(code.data, "QR_SCAN").finally(() => {
            // Re-enable the scanner so the next QR can be processed
            isProcessingScanRef.current = false;
          });
        }
      }, 200); // ~5fps - balanced for CPU and responsiveness
    },
    stop: () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    },
  });

  useEffect(() => {
    const scanningLoop = scanningLoopRef.current;
    return () => {
      stopCamera();
      scanningLoop.stop();
      if (scanPopupTimerRef.current) {
        clearTimeout(scanPopupTimerRef.current);
        scanPopupTimerRef.current = null;
      }
    };
  }, []);

  // When camera becomes active, start the scanning loop
  useEffect(() => {
    const scanningLoop = scanningLoopRef.current;
    if (cameraActive) {
      scanningLoop.start();
    } else {
      scanningLoop.stop();
    }
  }, [cameraActive]);

  // Initial stats fetch handled above
  // (supabase realtime subscription triggers refetch on changes)

  const fromCount = listPagination.total === 0 ? 0 : (listPagination.page - 1) * listPagination.limit + 1;
  const toCount = Math.min(listPagination.page * listPagination.limit, listPagination.total);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-600 border border-gold-500/20 mb-2">
            <UserCheck className="h-3.5 w-3.5" />
            <span>GATE & CHECK-IN SYSTEM</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">
            Check-In Scanner E-Ticket
          </h1>
          <p className="text-xs sm:text-sm text-navy-900/70">
            Scan QR E-Ticket peserta atau masukkan ID Order / Kode Tiket secara manual untuk mencatat kehadiran di gate venue.
          </p>
        </div>

        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-navy-900 hover:bg-secondary/40"
        >
          {audioEnabled ? <Volume2 className="h-4 w-4 text-emerald-600" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
          <span>Audio Beep: {audioEnabled ? "ON" : "OFF"}</span>
        </button>
      </div>

      {/* Realtime Attendance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Peserta Terdaftar</span>
          <p className="font-display text-2xl font-black text-navy-900 mt-1">
            {loadingStats ? "..." : stats.totalParticipants}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950 text-white p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Peserta Sudah Check-In</span>
          <p className="font-display text-2xl font-black text-emerald-400 mt-1">
            {loadingStats ? "..." : stats.totalCheckedIn}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Peserta Belum Hadir</span>
          <p className="font-display text-2xl font-black text-amber-600 mt-1">
            {loadingStats ? "..." : stats.remainingParticipants}
          </p>
        </div>
        <div className="rounded-2xl border border-gold-500/30 bg-navy-950 text-ivory-100 p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gold-400">Tingkat Kehadiran</span>
          <p className="font-display text-2xl font-black text-gold-400 mt-1">
            {loadingStats ? "..." : `${stats.attendancePercentage}%`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Camera Scanner Box */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-navy-950/20 bg-navy-950 text-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-gold-400" />
                <h3 className="font-display text-base font-bold text-ivory-100">Kamera Scanner QR</h3>
              </div>
              <div className="flex items-center gap-2">
                {cameraActive && (
                  <button
                    onClick={handleFlipCamera}
                    title={facingMode === "environment" ? "Pindah ke kamera depan" : "Pindah ke kamera belakang"}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-navy-700 bg-navy-800/60 px-3 py-1.5 text-xs font-bold text-ivory-100 hover:bg-navy-700 transition"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>{facingMode === "environment" ? "Depan" : "Belakang"}</span>
                  </button>
                )}
                <button
                  onClick={() => (cameraActive ? stopCamera() : startCamera())}
                  className={cn(
                    "rounded-xl px-4 py-1.5 text-xs font-bold transition",
                    cameraActive ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30" : "bg-gold-500 text-navy-950 hover:bg-gold-400"
                  )}
                >
                  {cameraActive ? "Matikan Kamera" : "Nyalakan Kamera"}
                </button>
              </div>
            </div>

            {cameraError && (
              <p className="rounded-xl bg-rose-500/15 border border-rose-500/30 px-3 py-2 text-[11px] text-rose-300">
                {cameraError}
              </p>
            )}

            {/* Video Feed / Canvas */}
            <div className="relative aspect-video w-full rounded-2xl bg-navy-900 border border-navy-800 overflow-hidden">
              <video
                ref={videoRef}
                style={{ transform: "none", WebkitTransform: "none" }}
                className={cn("w-full h-full object-cover transform-none", !cameraActive && "hidden")}
                autoPlay
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />

              {cameraActive ? (
                <>
                  {/* Scan target overlay: dim outside + corner brackets + animated scan line */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div
                      className="relative aspect-square rounded-xl"
                      style={{
                        width: "min(45%, 360px)",
                        boxShadow: "0 0 0 100vmax rgba(4, 10, 22, 0.55)",
                      }}
                    >
                      <span className="absolute left-0 top-0 h-9 w-9 rounded-tl-xl border-l-[3px] border-t-[3px] border-gold-400" />
                      <span className="absolute right-0 top-0 h-9 w-9 rounded-tr-xl border-r-[3px] border-t-[3px] border-gold-400" />
                      <span className="absolute bottom-0 left-0 h-9 w-9 rounded-bl-xl border-b-[3px] border-l-[3px] border-gold-400" />
                      <span className="absolute bottom-0 right-0 h-9 w-9 rounded-br-xl border-b-[3px] border-r-[3px] border-gold-400" />
                      <div className="scan-line" />
                    </div>
                  </div>
                  <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center">
                    <p className="rounded-full bg-navy-950/80 px-4 py-1.5 text-[11px] font-semibold text-gold-300 backdrop-blur-sm">
                      Arahkan QR E-Ticket ke dalam kotak
                    </p>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-center p-6 space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-800 text-navy-400">
                    <ScanLine className="h-6 w-6" />
                  </div>
                  <p className="text-xs text-navy-300 max-w-xs">
                    Klik &apos;Nyalakan Kamera&apos; di atas untuk memulai pemindaian QR code via webcam.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Manual Input & Scan Results Box */}
        <div className="lg:col-span-5 space-y-6">
          {/* Manual Code Input Form */}
          <div className="rounded-3xl border border-border bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Search className="h-4 w-4 text-gold-600" />
              <h3 className="font-display text-base font-bold text-navy-900">Manual Ticket / ID Order</h3>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1">ID Order / Kode Tiket / QR Token *</label>
                <input
                  type="text"
                  placeholder="Contoh: OM26-XXXXXX (ID Order) / TKT-OM26-XXXXXX (Kode Tiket)"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="w-full rounded-xl border bg-secondary/20 px-3.5 py-2.5 text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Jika memakai ID Order, seluruh tiket aktif pada order tersebut akan di-check-in sekaligus.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmittingManual || !manualInput.trim()}
                className="w-full rounded-xl bg-navy-900 py-3 text-xs font-bold text-white hover:bg-navy-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmittingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : "Proses Check-In Manual"}
              </button>
            </form>
          </div>

          {/* Scan Result Feedback Card */}
          {scanResult && (
            <div
              className={cn(
                "rounded-3xl p-6 shadow-lg border space-y-4 animate-fade-in",
                scanResult.status === "SUCCESS" && "bg-emerald-950 text-white border-emerald-500/40",
                scanResult.status === "ALREADY_CHECKED_IN" && "bg-amber-950 text-white border-amber-500/40",
                scanResult.status === "NOT_FOUND" && "bg-rose-950 text-white border-rose-500/40",
                scanResult.status === "TICKET_CANCELLED" && "bg-rose-950 text-white border-rose-500/40",
                scanResult.status === "ERROR" && "bg-rose-950 text-white border-rose-500/40"
              )}
            >
              <div className="flex items-center gap-3">
                {scanResult.status === "SUCCESS" && <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" />}
                {scanResult.status === "ALREADY_CHECKED_IN" && <AlertTriangle className="h-8 w-8 text-amber-400 shrink-0" />}
                {(scanResult.status === "NOT_FOUND" || scanResult.status === "TICKET_CANCELLED" || scanResult.status === "ERROR") && (
                  <XCircle className="h-8 w-8 text-rose-400 shrink-0" />
                )}

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{scanResult.status}</span>
                  <h4 className="font-display text-base font-bold">{scanResult.message}</h4>
                </div>
              </div>

              {/* Order-based check-in result */}
              {scanResult.data?.orderCode && (
                <div className="rounded-2xl bg-black/30 p-4 text-xs space-y-2 border border-white/10">
                  <div className="flex justify-between">
                    <span className="opacity-70">Order ID:</span>
                    <span className="font-mono font-bold text-gold-400">{scanResult.data.orderCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Check-In Baru:</span>
                    <span className="font-bold text-emerald-300">{scanResult.data.checkedInCount ?? 0} peserta</span>
                  </div>
                  {(scanResult.data.alreadyCheckedInCount ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="opacity-70">Sudah Check-In Sebelumnya:</span>
                      <span className="font-bold text-amber-300">{scanResult.data.alreadyCheckedInCount} peserta</span>
                    </div>
                  )}
                  {scanResult.data.tickets && scanResult.data.tickets.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-white/10 max-h-40 overflow-y-auto">
                      {scanResult.data.tickets.map((t) => (
                        <div key={t.ticketId} className="flex items-center justify-between gap-2">
                          <span className="truncate opacity-90">
                            {t.participantName}
                            <span className="text-[10px] opacity-60 block">{t.ticketTypeName}</span>
                          </span>
                          <span className={cn("font-mono text-[10px] shrink-0", t.alreadyCheckedIn ? "text-amber-300" : "text-emerald-300")}>
                            {t.alreadyCheckedIn ? "SUDAH" : "OK"} · {t.ticketCode}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Single ticket check-in result */}
              {scanResult.data?.ticket && (
                <div className="rounded-2xl bg-black/30 p-4 text-xs space-y-2 border border-white/10">
                  <div className="flex justify-between">
                    <span className="opacity-70">Nama Peserta:</span>
                    <span className="font-bold">{scanResult.data.ticket.participant.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">NIM / Email:</span>
                    <span>{scanResult.data.ticket.participant.nim} · {scanResult.data.ticket.participant.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Order ID:</span>
                    <span className="font-mono">{scanResult.data.ticket.order.orderCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Kode Tiket:</span>
                    <span className="font-mono font-bold text-gold-400">{scanResult.data.ticket.ticketCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Jenis Tiket:</span>
                    <span>{scanResult.data.ticket.ticketTypeName}</span>
                  </div>
                  {scanResult.data.operatorName && (
                    <div className="flex justify-between">
                      <span className="opacity-70">Check-in oleh:</span>
                      <span className="font-semibold text-gold-300">{scanResult.data.operatorName}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Paginated Participant List */}
      <div className="rounded-3xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 border-b border-border">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-600 border border-gold-500/20 mb-2">
              <ClipboardList className="h-3.5 w-3.5" />
              <span>INTEGRASI DATA KEHADIRAN</span>
            </div>
            <h2 className="font-display text-xl font-bold text-navy-900">Daftar Peserta Check-In</h2>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nama, NIM, kode tiket, atau ID order..."
              value={listSearch}
              onChange={(e) => {
                setListSearch(e.target.value);
                setListPage(1);
              }}
              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 pl-10 pr-4 text-xs text-navy-900 placeholder:text-muted-foreground focus:border-gold-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 px-5 sm:px-6 py-4 border-b border-border">
          {[
            { id: "ALL" as const, label: "Semua Peserta", count: stats.totalParticipants },
            { id: "CHECKED_IN" as const, label: "Sudah Check-In", count: stats.totalCheckedIn },
            { id: "NOT_PRESENT" as const, label: "Belum Hadir", count: stats.remainingParticipants },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setListStatus(tab.id);
                setListPage(1);
              }}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all",
                listStatus === tab.id
                  ? "bg-navy-900 text-gold-400 shadow-sm"
                  : "bg-secondary/40 text-navy-900/70 hover:bg-secondary hover:text-navy-900"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px]",
                  listStatus === tab.id ? "bg-gold-500 text-navy-950" : "bg-border text-muted-foreground"
                )}
              >
                {loadingStats ? "..." : tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 text-navy-900 uppercase font-bold text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-5 py-4">No</th>
                <th className="px-5 py-4">Nama Peserta</th>
                <th className="px-5 py-4">NIM / Fakultas</th>
                <th className="px-5 py-4">Order ID</th>
                <th className="px-5 py-4">Kode Tiket</th>
                <th className="px-5 py-4">Jenis Tiket</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Waktu Check-In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin inline-block text-gold-600" />
                    <span className="ml-2 text-muted-foreground">Memuat data peserta...</span>
                  </td>
                </tr>
              ) : listItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12">
                    <EmptyState
                      icon={Users}
                      title="Peserta tidak ditemukan"
                      description="Tidak ada peserta yang sesuai dengan filter atau pencarian saat ini."
                    />
                  </td>
                </tr>
              ) : (
                listItems.map((row, index) => (
                  <tr key={row.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-4 text-muted-foreground">
                      {(listPagination.page - 1) * listPagination.limit + index + 1}
                    </td>
                    <td className="px-5 py-4">
                      <strong className="block text-navy-900 font-bold">{row.participant?.full_name ?? "-"}</strong>
                      <span className="text-[10px] text-muted-foreground">{row.participant?.email ?? "-"}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="block text-navy-900 font-medium">{row.participant?.nim ?? "-"}</span>
                      <span className="text-[10px] text-muted-foreground block truncate max-w-[140px]">{row.participant?.faculty ?? "-"}</span>
                    </td>
                    <td className="px-5 py-4 font-mono font-semibold text-navy-900 whitespace-nowrap">
                      {row.order?.order_code ?? "-"}
                    </td>
                    <td className="px-5 py-4 font-mono text-gold-600 whitespace-nowrap">{row.ticketCode}</td>
                    <td className="px-5 py-4 whitespace-nowrap">{row.ticketTypeName}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {row.isCheckedIn ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Sudah Hadir
                        </span>
                      ) : row.status === "CANCELLED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-rose-700">
                          <XCircle className="h-3 w-3" /> Dibatalkan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                          <AlertTriangle className="h-3 w-3" /> Belum Hadir
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                      {row.checkIn ? (
                        <span>
                          <span className="block">
                            {new Date(row.checkIn.checked_in_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                          {row.checkIn.profiles?.full_name && (
                            <span className="text-[10px] text-gold-600 block font-semibold">
                              {row.checkIn.method === "MANUAL" ? "Manual" : "Scan"} oleh {row.checkIn.profiles.full_name}
                            </span>
                          )}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-border bg-secondary/20">
          <p className="text-[11px] text-muted-foreground">
            Menampilkan <strong className="text-navy-900">{fromCount}</strong>–<strong className="text-navy-900">{toCount}</strong> dari{" "}
            <strong className="text-navy-900">{listPagination.total}</strong> peserta
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={listPage <= 1 || listLoading}
              onClick={() => setListPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-navy-900 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya
            </button>
            <span className="text-xs font-bold text-navy-900 px-2">
              Halaman {listPagination.page} / {Math.max(1, listPagination.totalPages)}
            </span>
            <button
              type="button"
              disabled={listPage >= listPagination.totalPages || listLoading}
              onClick={() => setListPage((p) => Math.min(listPagination.totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-navy-900 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Berikutnya <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Success Check-In Popup Modal */}
      {scanPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            className="relative w-full max-w-sm rounded-3xl border border-emerald-500/40 bg-navy-950 p-8 text-center shadow-2xl animate-in zoom-in-95 fade-in-0 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeScanPopup}
              className="absolute right-4 top-4 rounded-full p-1.5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Tutup notifikasi"
            >
              ✕
            </button>

            <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
              <span className="absolute inset-0 rounded-full bg-emerald-400/10" />
              <CheckCircle2 className="relative h-16 w-16 text-emerald-400 animate-check-pop" />
            </div>

            <h3 className="font-display mt-5 text-2xl font-bold text-white">Check-in Berhasil!</h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">{scanPopup.message}</p>

            {scanPopup.data?.ticket && (
              <div className="mt-5 space-y-1.5 rounded-2xl bg-black/30 border border-white/10 p-4 text-sm text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-white/50">Peserta</span>
                  <span className="font-bold text-white truncate">{scanPopup.data.ticket.participant.fullName}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-white/50">Order</span>
                  <span className="font-mono text-xs text-gold-400">{scanPopup.data.ticket.order.orderCode}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-white/50">Tiket</span>
                  <span className="font-mono text-xs font-bold text-emerald-300">{scanPopup.data.ticket.ticketCode}</span>
                </div>
                {scanPopup.data.operatorName && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-white/50">Check-in oleh</span>
                    <span className="font-semibold text-gold-300">{scanPopup.data.operatorName}</span>
                  </div>
                )}
              </div>
            )}

            {scanPopup.data?.orderCode && (
              <div className="mt-5 space-y-1.5 rounded-2xl bg-black/30 border border-white/10 p-4 text-sm text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-white/50">Order</span>
                  <span className="font-mono text-xs text-gold-400">{scanPopup.data.orderCode}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-white/50">Check-in Baru</span>
                  <span className="font-mono text-xs font-bold text-emerald-300">
                    {scanPopup.data.checkedInCount ?? 0} peserta
                  </span>
                </div>
                {(scanPopup.data.alreadyCheckedInCount ?? 0) > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-white/50">Sudah Sebelumnya</span>
                    <span className="font-mono text-xs font-bold text-amber-300">
                      {scanPopup.data.alreadyCheckedInCount} peserta
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={closeScanPopup}
              className="mt-6 w-full rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-emerald-950 hover:bg-emerald-400 transition-colors"
            >
              Oke, Lanjut
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
