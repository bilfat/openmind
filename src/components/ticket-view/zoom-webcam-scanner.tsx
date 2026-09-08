import React, { useState, useEffect, useRef } from "react";
import jsQR from "jsqr";
import { Camera, X, Loader2 } from "lucide-react";

interface ZoomWebcamScannerProps {
  zoomToken: string;
  zoomStatus: string;
}

export function ZoomWebcamScanner({ zoomToken, zoomStatus }: ZoomWebcamScannerProps) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanState, setScanState] = useState<"idle" | "processing" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();
        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setErrorMessage("Tidak bisa mengakses kamera. Pastikan izin diberikan.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  useEffect(() => {
    if (scannerOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [scannerOpen]);

  const scanFrame = () => {
    if (!scannerOpen) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.height = video.videoHeight;
    canvas.width = video.videoWidth;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data.includes("/zoom/join?s=")) {
      try {
        const url = new URL(code.data);
        const sessionToken = url.searchParams.get("s");
        if (sessionToken) {
          handleZoomWithSession(sessionToken);
          return; // Stop scanning once we have a token
        }
      } catch (e) {
        // Invalid URL, continue scanning
      }
    }
    animFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const handleZoomWithSession = async (sessionToken: string) => {
    stopCamera();
    setScanState("processing");
    
    try {
      const res = await fetch("/api/check-in/verify-zoom-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoomToken, sessionToken }),
      });
      const payload = await res.json();
      
      if (res.ok && payload.success && payload.data?.redirectUrl) {
        window.location.href = payload.data.redirectUrl;
      } else {
        setScanState("error");
        setErrorMessage(payload.message || "Gagal memverifikasi QR.");
      }
    } catch (err) {
      setScanState("error");
      setErrorMessage("Terjadi kesalahan jaringan.");
    }
  };

  return (
    <div className="mt-3">
      {!scannerOpen ? (
        <button
          id="zoom-scanner-toggle-btn"
          onClick={() => setScannerOpen(true)}
          className="text-xs text-blue-300 hover:text-blue-200 underline underline-offset-2 flex items-center justify-center w-full py-2 gap-1.5 transition-colors"
        >
          <Camera className="h-3.5 w-3.5" /> Atau scan QR dari panitia dengan webcam
        </button>
      ) : (
        <div className="space-y-3 rounded-xl bg-navy-900/50 p-3 border border-navy-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-300">Scanner Kamera</span>
            <button
              onClick={() => setScannerOpen(false)}
              className="text-ivory-200/50 hover:text-ivory-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center min-h-[200px]">
            {scanState === "processing" ? (
              <div className="flex flex-col items-center gap-3 text-blue-400">
                <Loader2 className="animate-spin h-8 w-8" />
                <span className="text-xs font-bold">Memproses QR...</span>
              </div>
            ) : errorMessage ? (
              <p className="text-xs text-red-400 text-center px-4">{errorMessage}</p>
            ) : (
              <>
                <video ref={videoRef} className="w-full h-full object-cover absolute inset-0" />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-blue-400/80 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-400/80 shadow-[0_0_8px_rgba(96,165,250,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                    
                    {/* Corner markers */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-400 rounded-tl-sm"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-400 rounded-tr-sm"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-400 rounded-bl-sm"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-400 rounded-br-sm"></div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <p className="text-[10px] text-ivory-200/60 text-center leading-relaxed">
            Arahkan kamera ke QR Session yang dibagikan panitia di grup WhatsApp. 
            Pastikan QR berada di dalam kotak.
          </p>
        </div>
      )}
    </div>
  );
}
