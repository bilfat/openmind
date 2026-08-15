"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCodeDisplay({
  value,
  size = 200,
  className,
}: QRCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: {
        dark: "#0B1728",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error("Error generating QR:", err));
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center bg-secondary/50 rounded-xl animate-pulse text-xs text-muted-foreground"
      >
        <span>Membuat QR Code...</span>
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative overflow-hidden rounded-xl bg-white p-2 border border-border shadow-inner ${className}`}
    >
      <Image
        src={dataUrl}
        alt={`QR Code for ${value}`}
        width={size}
        height={size}
        className="w-full h-full object-contain"
        unoptimized
      />
    </div>
  );
}
