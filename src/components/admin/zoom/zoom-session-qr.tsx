import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Download, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ZoomSessionQRProps {
  sessionActive?: boolean;
  sessionExpiresAt?: string | null;
  zoomLinkReady?: boolean;
  initialQrCodeUrl?: string | null;
}

export function ZoomSessionQR({
  sessionActive = false,
  sessionExpiresAt,
  zoomLinkReady = false,
  initialQrCodeUrl,
}: ZoomSessionQRProps) {
  const [expiresInHours, setExpiresInHours] = useState("12");
  const [generating, setGenerating] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  useEffect(() => {
    setQrCodeDataUrl(initialQrCodeUrl || null);
  }, [initialQrCodeUrl]);

  const handleGenerateQR = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/zoom/generate-session-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInHours }),
      });
      const data = await res.json();
      if (data.success) {
        setQrCodeDataUrl(data.data.qrCodeDataUrl);
      } else {
        alert("Gagal generate QR: " + data.message);
      }
    } catch (err) {
      alert("Terjadi kesalahan.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-900 p-4 sm:p-6 space-y-3 sm:space-y-4">
      <h3 className="font-bold text-sm sm:text-base text-ivory-100">Session QR — Grup WA</h3>

      {/* Status: apakah ada session aktif */}
      {sessionActive ? (
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="font-semibold">Session QR aktif</span>
          {sessionExpiresAt && (
            <span className="text-[10px] sm:text-xs text-ivory-200/50 block w-full sm:w-auto sm:inline">
              Berlaku sampai: {new Date(sessionExpiresAt).toLocaleString("id-ID")}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="font-semibold">Belum ada Session QR aktif</span>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-4 sm:gap-6 pt-1">
        {/* Generator Controls */}
        <div className="flex-1 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <select
              value={expiresInHours}
              onChange={(e) => setExpiresInHours(e.target.value)}
              className="rounded-xl border border-navy-700 bg-navy-800 py-2 px-3 text-xs sm:text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
            >
              <option value="6">Berlaku 6 jam</option>
              <option value="12">Berlaku 12 jam (default)</option>
              <option value="24">Berlaku 24 jam</option>
            </select>
            <button
              onClick={handleGenerateQR}
              disabled={generating || !zoomLinkReady}
              title={!zoomLinkReady ? "Simpan URL Zoom terlebih dahulu" : "Generate QR Sesi"}
              className="rounded-xl bg-gold-500 px-3.5 py-2 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-colors flex-1 sm:flex-none flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {generating ? (
                <>
                  <span className="animate-spin">⏳</span> Generating...
                </>
              ) : (
                <>⚡ Generate Session QR</>
              )}
            </button>
          </div>

          {/* Info box Collapsible Accordion */}
          <details className="group rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 overflow-hidden">
            <summary className="flex items-center justify-between p-2.5 sm:p-3 font-semibold cursor-pointer select-none text-[11px] sm:text-xs">
              <span className="flex items-center gap-1.5">
                <span>💡</span> Cara kerja Session QR
              </span>
              <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180 opacity-70" />
            </summary>
            <div className="px-3 pb-2.5 pt-0 border-t border-blue-500/10 space-y-1 text-[10px] sm:text-xs text-blue-200/80">
              <ol className="list-decimal list-inside space-y-1 ml-0.5">
                <li>Generate QR di sini &rarr; share ke grup WA peserta</li>
                <li>Peserta buka e-tiket &rarr; klik "Buka Scanner Webcam"</li>
                <li>Scan QR dari chat WA &rarr; langsung join Zoom</li>
                <li>Tanpa e-tiket valid, QR tidak bisa dipakai orang lain</li>
              </ol>
            </div>
          </details>
        </div>

        {/* QR Display */}
        {qrCodeDataUrl && (
          <div className="w-full sm:w-44 xl:w-52 mx-auto flex-shrink-0 flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-border">
            <div className="w-full aspect-square max-w-[150px] bg-gray-100 flex items-center justify-center rounded-lg overflow-hidden border border-gray-200">
              <img
                src={qrCodeDataUrl}
                alt="Session QR"
                className="w-full h-full object-contain p-1"
              />
            </div>
            <p className="text-[9px] text-navy-900/70 text-center leading-tight">
              Share QR ke WA. Peserta scan via e-tiket.
            </p>
            <a
              href={qrCodeDataUrl}
              download="zoom-session-qr.png"
              className="w-full rounded-lg bg-navy-900 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-navy-800 transition-colors flex items-center justify-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> Download PNG
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
