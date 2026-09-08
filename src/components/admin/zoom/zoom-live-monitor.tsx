import React, { useState, useMemo } from "react";
import { RefreshCw, Power, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface RecentAccess {
  participantName: string;
  ticketCode: string;
  ticketTypeName: string;
  accessedAt: string;
}

interface ZoomLiveMonitorProps {
  recentAccess?: RecentAccess[];
  isSuperAdmin?: boolean;
  canResetToken?: boolean;
  zoomLiveTrackingEnabled?: boolean;
}

export function ZoomLiveMonitor({ 
  recentAccess = [], 
  isSuperAdmin = false,
  canResetToken = false,
  zoomLiveTrackingEnabled = false
}: ZoomLiveMonitorProps) {
  const { success, error } = useToast();
  const [isToggling, setIsToggling] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return recentAccess;
    const q = search.toLowerCase();
    return recentAccess.filter(
      (item) =>
        item.participantName.toLowerCase().includes(q) ||
        item.ticketCode.toLowerCase().includes(q) ||
        item.ticketTypeName.toLowerCase().includes(q)
    );
  }, [recentAccess, search]);

  const handleToggleTracking = async () => {
    if (!isSuperAdmin) return;
    setIsToggling(true);
    try {
      const newState = !zoomLiveTrackingEnabled;
      const res = await fetch("/api/admin/zoom/change-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoomLiveTrackingEnabled: newState }),
      });
      const data = await res.json();
      if (data.success) {
        success(`Live tracking ${newState ? "diaktifkan" : "dinonaktifkan"}.`);
        window.location.reload();
      } else {
        error("Gagal mengubah status tracking.");
      }
    } catch (err) {
      error("Terjadi kesalahan jaringan.");
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-900 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-ivory-100">Live Join Activity</h3>
          {isSuperAdmin && (
            <button
              onClick={handleToggleTracking}
              disabled={isToggling}
              className={cn(
                "p-1.5 rounded-lg border transition-colors flex items-center justify-center",
                zoomLiveTrackingEnabled 
                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30" 
                  : "bg-navy-800 border-navy-700 text-navy-400 hover:text-ivory-100 hover:bg-navy-700"
              )}
              title={zoomLiveTrackingEnabled ? "Nonaktifkan Tracking" : "Aktifkan Tracking"}
            >
              <Power className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-ivory-200/50">
          {zoomLiveTrackingEnabled ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Auto-refresh 60 detik</span>
            </>
          ) : (
            <span>Tracking Dinonaktifkan</span>
          )}
        </div>
      </div>

      {/* Search bar */}
      {recentAccess.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-navy-400" />
          <input
            type="text"
            placeholder="Cari nama peserta, kode tiket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-navy-700 bg-navy-800 py-2 pl-8 pr-3 text-xs text-ivory-100 placeholder:text-navy-400 focus:border-gold-500 focus:outline-none"
          />
        </div>
      )}

      {recentAccess.length === 0 ? (
        <div className="py-12 text-center rounded-xl bg-navy-800/50 border border-navy-800 border-dashed">
          <p className="text-sm text-ivory-200/40">Belum ada peserta yang join Zoom.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold text-ivory-200/40 uppercase tracking-wider border-b border-navy-700">
                  <th className="pb-3 px-2">Peserta</th>
                  <th className="pb-3 px-2">Kode Tiket</th>
                  <th className="pb-3 px-2">Tipe Tiket</th>
                  <th className="pb-3 px-2 text-right">Waktu Join</th>
                  {canResetToken && <th className="pb-3 px-2 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={canResetToken ? 5 : 4} className="py-8 text-center text-xs text-ivory-200/40">
                      Tidak ada hasil untuk "{search}"
                    </td>
                  </tr>
                ) : filtered.map((item, index) => (
                  <tr key={`${item.ticketCode}-${index}`} className="text-ivory-100/80 hover:bg-navy-800/50 transition-colors">
                    <td className="py-3 px-2 font-medium">{item.participantName}</td>
                    <td className="py-3 px-2 font-mono text-xs text-gold-400">{item.ticketCode}</td>
                    <td className="py-3 px-2 text-xs">{item.ticketTypeName}</td>
                    <td className="py-3 px-2 text-xs text-ivory-200/60 text-right">
                      {new Date(item.accessedAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    {canResetToken && (
                      <td className="py-3 px-2 text-right">
                        <ResetTokenButton ticketCode={item.ticketCode} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List View */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 ? (
              <p className="text-center text-xs text-ivory-200/40 py-4">Tidak ada hasil untuk "{search}"</p>
            ) : filtered.map((item, index) => (
              <div key={`${item.ticketCode}-${index}`} className="p-3 rounded-xl bg-navy-800/50 border border-navy-700 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-sm text-ivory-100">{item.participantName}</span>
                  <span className="text-[10px] text-ivory-200/60 whitespace-nowrap">
                    {new Date(item.accessedAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-gold-400">{item.ticketCode}</span>
                  <span className="text-ivory-200/70">{item.ticketTypeName}</span>
                </div>
                {canResetToken && (
                  <div className="pt-1">
                    <ResetTokenButton ticketCode={item.ticketCode} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-komponen tombol Reset ──────────────────────────────────────────────────
function ResetTokenButton({ ticketCode }: { ticketCode: string }) {
  const [resetting, setResetting] = useState(false);
  const [done, setDone] = useState(false);
  const { success, error } = useToast();

  const handleReset = async () => {
    if (!confirm(`Reset akses Zoom untuk tiket ${ticketCode}? Peserta akan bisa join ulang.`)) return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/zoom/reset-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketCode }),
      });
      const data = await res.json();
      if (data.success) {
        success(`Token ${ticketCode} berhasil di-reset.`);
        setDone(true);
      } else {
        error(data.message || "Gagal reset token.");
      }
    } catch {
      error("Terjadi kesalahan jaringan.");
    } finally {
      setResetting(false);
    }
  };

  if (done) {
    return <span className="text-[10px] text-emerald-400 font-semibold">✓ Direset</span>;
  }

  return (
    <button
      onClick={handleReset}
      disabled={resetting}
      className="text-[10px] font-bold text-amber-400 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg px-2 py-1 transition-colors disabled:opacity-50 whitespace-nowrap"
    >
      {resetting ? "Mereset..." : "↺ Reset Akses"}
    </button>
  );
}
