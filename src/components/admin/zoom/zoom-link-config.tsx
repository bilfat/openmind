import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface ZoomLinkConfigProps {
  zoomEnabled?: boolean;
  zoomLinkReady?: boolean;
  zoomLinkUpdatedAt?: string | null;
  zoomMeetingLink?: string | null;
}

export function ZoomLinkConfig({
  zoomEnabled = false,
  zoomLinkReady = false,
  zoomLinkUpdatedAt,
  zoomMeetingLink,
}: ZoomLinkConfigProps) {
  const [enabled, setEnabled] = useState(zoomEnabled);
  const [linkInput, setLinkInput] = useState("");
  const [isEditingLink, setIsEditingLink] = useState(!zoomLinkReady);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { success, error } = useToast();

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEnabled(zoomEnabled);
  }, [zoomEnabled]);

  useEffect(() => {
    setIsEditingLink(!zoomLinkReady);
  }, [zoomLinkReady]);

  const handleToggleZoom = async () => {
    try {
      const newState = !enabled;
      setEnabled(newState);
      await fetch("/api/admin/zoom/change-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoomEnabled: newState }),
      });
      success(`Zoom hybrid access ${newState ? "diaktifkan" : "dinonaktifkan"}.`);
    } catch (err) {
      error("Gagal mengubah status zoom.");
      setEnabled(!enabled); // revert
    }
  };

  const handleSaveLink = async () => {
    if (!/^https:\/\/([\w-]+\.)?zoom\.us\//.test(linkInput)) {
      error("URL Zoom tidak valid. Pastikan diawali dengan https://...zoom.us/");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/zoom/change-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoomMeetingLink: linkInput }),
      });
      const data = await res.json();
      if (data.success) {
        success("Zoom link berhasil disimpan.");
        setLinkInput("");
        // Reload page to reflect changes
        window.location.reload();
      } else {
        error(data.message || "Gagal menyimpan link.");
      }
    } catch (err) {
      error("Gagal menyimpan link zoom.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLink = async () => {
    if (!confirm("Yakin ingin menghapus link Zoom?")) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/zoom/change-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoomMeetingLink: null }),
      });
      const data = await res.json();
      if (data.success) {
        success("Zoom link berhasil dihapus.");
        window.location.reload();
      } else {
        error(data.message || "Gagal menghapus link.");
      }
    } catch (err) {
      error("Gagal menghapus link zoom.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateTokens = async () => {
    if (!confirm("Aksi ini akan membuat semua token pending sebelumnya menjadi tidak valid. Peserta harus refresh halaman tiket mereka untuk mendapatkan token baru. Lanjutkan?")) return;
    setIsRegenerating(true);
    try {
      const res = await fetch("/api/admin/zoom/regenerate-tokens", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        success(`Token berhasil di-regenerate untuk ${data.regeneratedCount} peserta pending.`);
      } else {
        error(data.message || "Gagal meregenerate token.");
      }
    } catch (err) {
      error("Terjadi kesalahan.");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-900 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-ivory-100">Konfigurasi Zoom</h3>
        <span className="text-[10px] bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full">
          SUPER ADMIN ONLY
        </span>
      </div>

      {/* Status indicator */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {zoomLinkReady ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-400" />
        )}
        <span className={zoomLinkReady ? "text-emerald-400" : "text-amber-400"}>
          {zoomLinkReady ? "Zoom link sudah diset" : "Zoom link belum diisi"}
        </span>
        {zoomLinkUpdatedAt && (
          <span className="text-xs text-ivory-200/50 block sm:inline">
            Terakhir: {new Date(zoomLinkUpdatedAt).toLocaleString("id-ID")}
          </span>
        )}
      </div>

      {/* Toggle zoom enabled (Lock / Unlock switch) */}
      <div className="py-3 border-y border-navy-700/50 space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-semibold text-ivory-100 block">
              Buka Akses Zoom untuk Peserta
            </label>
            <p className="text-[11px] text-ivory-200/60">
              {enabled
                ? "🟢 Sesi Zoom DIBUKA. Peserta dapat mengeklik tombol Join Zoom di E-Tiket."
                : "🔒 Sesi Zoom TERKUNCI. Tombol Join Zoom di E-Tiket peserta terkunci hingga dibuka di hari H."}
            </p>
          </div>
          <button
            onClick={handleToggleZoom}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-navy-900 flex-shrink-0 ml-3",
              enabled ? "bg-emerald-500" : "bg-navy-700"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                enabled ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </div>

      {/* Link display & input (Panitia bebas menginput link jauh-jauh hari) */}
      <div className="space-y-3 pt-1">
        <div>
          <label className="block text-xs font-semibold text-ivory-200 mb-1.5">
            Zoom Meeting Link
          </label>
          
          {!isEditingLink && zoomLinkReady ? (
            <div className="flex items-center justify-between bg-navy-800 border border-navy-700 rounded-xl p-3">
              <span className="text-sm text-ivory-100 truncate mr-2">
                {zoomMeetingLink}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => { setLinkInput(zoomMeetingLink || ""); setIsEditingLink(true); }} className="p-1.5 text-navy-400 hover:text-ivory-100 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={handleDeleteLink} className="p-1.5 text-red-400 hover:text-red-300 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://zoom.us/j/123456789"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                className="flex-1 w-full rounded-xl border border-navy-700 bg-navy-800 py-2.5 px-3.5 text-sm text-ivory-100 placeholder:text-navy-700 focus:border-gold-500 focus:outline-none"
              />
              <button
                onClick={handleSaveLink}
                disabled={isSaving || !linkInput.trim()}
                className="rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-colors disabled:opacity-50"
              >
                {isSaving ? "Menyimpan..." : "Simpan"}
              </button>
              {zoomLinkReady && (
                <button onClick={() => setIsEditingLink(false)} className="rounded-xl bg-navy-700 px-4 py-2 text-xs font-bold text-ivory-100 hover:bg-navy-600 transition-colors">
                  Batal
                </button>
              )}
            </div>
          )}
          <p className="mt-1.5 text-[10px] text-ivory-200/40">
            Panitia dapat menyimpan link Zoom sebelum hari H. Link tidak akan terlihat oleh peserta.
          </p>
        </div>
      </div>

      {/* Emergency: Regenerate Tokens */}
      <div className="border-t border-navy-700 pt-5 mt-5">
        <p className="text-xs text-amber-400 font-bold mb-2">⚠️ Emergency Action</p>
        <button
            onClick={handleRegenerateTokens}
            className="w-full sm:w-auto rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2"
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <span className="animate-spin text-amber-400">🔄</span>
            ) : (
              <span>🔄 Regenerate Semua Token Individu</span>
            )}
          </button>
          <p className="mt-2 text-[10px] text-ivory-200/40">
            Gunakan jika Zoom link diganti atau ada masalah akses masal.
          </p>
        </div>
    </div>
  );
}
