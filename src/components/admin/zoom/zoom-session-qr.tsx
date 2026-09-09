import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Download } from "lucide-react";
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
    <div className="rounded-2xl border border-navy-700 bg-navy-900 p-6 space-y-4">
      <h3 className="font-bold text-ivory-100">Session QR — Grup WA</h3>

      {/* Status: apakah ada session aktif */}
      {sessionActive ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span className="font-semibold">Session QR aktif</span>
          {sessionExpiresAt && (
            <span className="text-xs text-ivory-200/50 block w-full sm:w-auto sm:inline">
              Berlaku sampai: {new Date(sessionExpiresAt).toLocaleString("id-ID")}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-semibold">Belum ada Session QR aktif</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 mt-4">
        {/* Generator Controls */}
        <div className="flex-1 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              value={expiresInHours}
              onChange={(e) => setExpiresInHours(e.target.value)}
              className="rounded-xl border border-navy-700 bg-navy-800 py-2.5 px-3.5 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
            >
              <option value="6">Berlaku 6 jam</option>
              <option value="12">Berlaku 12 jam (default)</option>
              <option value="24">Berlaku 24 jam</option>
            </select>
            <button
              onClick={handleGenerateQR}
              disabled={generating || !zoomLinkReady}
              title={!zoomLinkReady ? "Simpan URL Zoom terlebih dahulu" : "Generate QR Sesi"}
              className="rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-colors flex-1 sm:flex-none flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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

          {/* Info box */}
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 text-xs text-blue-300 space-y-2">
            <p className="font-bold flex items-center gap-2">
              <span>💡</span> Cara kerja Session QR:
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-1">
              <li>Generate QR di sini &rarr; share ke grup WA peserta</li>
              <li>Peserta buka halaman e-tiket &rarr; klik "Buka Scanner Webcam"</li>
              <li>Scan QR dari chat WA menggunakan webcam &rarr; langsung join Zoom</li>
              <li>Tanpa e-tiket valid, QR ini tidak berguna bagi orang lain</li>
            </ol>
          </div>
        </div>

        {/* QR Display */}
        {qrCodeDataUrl && (
          <div className="w-[200px] md:w-64 mx-auto flex-shrink-0 flex flex-col items-center gap-4 p-4 md:p-5 bg-white rounded-2xl border border-border">
            <div className="w-full aspect-square bg-gray-100 flex items-center justify-center rounded-xl overflow-hidden border border-gray-200">
              {/* Replace with actual QR image */}
              <img
                src={qrCodeDataUrl}
                alt="Session QR"
                className="w-full h-full object-contain p-1"
              />
            </div>
            <p className="text-[10px] text-navy-900/70 text-center leading-tight">
              Share QR ini ke grup WhatsApp. Peserta scan menggunakan webcam dari e-tiket mereka.
            </p>
            <a
              href={qrCodeDataUrl}
              download="zoom-session-qr.png"
              className="w-full rounded-xl bg-navy-900 px-3 py-2 text-xs font-bold text-white hover:bg-navy-800 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" /> Download PNG
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
