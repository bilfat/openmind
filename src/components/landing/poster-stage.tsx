"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles, Maximize2, X, Ticket, Download, Share2 } from "lucide-react";
import Link from "next/link";

export function PosterStage() {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <div className="relative w-full overflow-hidden bg-navy-950 py-16 sm:py-24 rounded-3xl border border-gold-500/30 shadow-2xl">
      {/* Deep Theatrical Stage Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950 via-[#0a1424] to-navy-950" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,162,74,0.15)_0%,transparent_70%)]" />

      {/* ================= SPOTLIGHT BEAMS (Lampu Sorot) ================= */}
      {/* Top Center Spotlight Source */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-gold-400/30 rounded-full blur-2xl pointer-events-none" />
      
      {/* Left Angled Spotlight Cone */}
      <div
        className="absolute -top-10 left-1/4 w-72 sm:w-96 h-[600px] pointer-events-none opacity-40 mix-blend-screen"
        style={{
          background: "linear-gradient(135deg, rgba(232, 207, 138, 0.6) 0%, rgba(201, 162, 74, 0.15) 40%, transparent 80%)",
          clipPath: "polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)",
          transform: "rotate(-12deg)",
        }}
      />

      {/* Right Angled Spotlight Cone */}
      <div
        className="absolute -top-10 right-1/4 w-72 sm:w-96 h-[600px] pointer-events-none opacity-40 mix-blend-screen"
        style={{
          background: "linear-gradient(225deg, rgba(232, 207, 138, 0.6) 0%, rgba(201, 162, 74, 0.15) 40%, transparent 80%)",
          clipPath: "polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)",
          transform: "rotate(12deg)",
        }}
      />

      {/* Center Focused Spotlight Pillar */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-80 sm:w-[500px] h-[650px] pointer-events-none opacity-30 mix-blend-screen"
        style={{
          background: "radial-gradient(ellipse at top, rgba(247, 235, 208, 0.7) 0%, rgba(201, 162, 74, 0.2) 50%, transparent 80%)",
        }}
      />

      {/* Floating Gold Sparkles Particles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-1.5 h-1.5 bg-gold-300 rounded-full animate-ping opacity-60" />
        <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-gold-400 rounded-full animate-pulse opacity-75" />
        <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-ivory-100 rounded-full animate-ping opacity-50" />
        <div className="absolute top-2/3 right-1/4 w-1.5 h-1.5 bg-gold-300 rounded-full animate-pulse opacity-60" />
      </div>

      {/* ================= STAGE CONTENT ================= */}
      <div className="relative z-20 flex flex-col items-center justify-center px-4">
        {/* Stage Title Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-navy-900/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-gold-400 backdrop-blur-md mb-8 shadow-lg shadow-gold-500/10">
          <Sparkles className="h-3.5 w-3.5 text-gold-400 animate-spin" style={{ animationDuration: "6s" }} />
          <span>OFFICIAL LINEUP & EVENT POSTER</span>
        </div>

        {/* Poster Container with Float Animation & Luxury Frame */}
        <motion.div
          animate={{ y: [-6, 6, -6] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="relative group cursor-pointer"
          onClick={() => setIsZoomed(true)}
        >
          {/* Intense Backlight Halo behind poster */}
          <div className="absolute -inset-4 bg-gradient-to-r from-gold-500/30 via-gold-300/40 to-gold-500/30 rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Luxury Baroque Outer Frame */}
          <div className="relative rounded-2xl p-2.5 sm:p-3.5 bg-gradient-to-b from-gold-300 via-gold-500 to-gold-700 shadow-2xl shadow-black/80 border border-gold-300/50">
            {/* Inner Border Inset */}
            <div className="relative rounded-xl overflow-hidden border-2 border-navy-950 bg-navy-950">
              <div className="relative w-[280px] sm:w-[360px] md:w-[420px] aspect-[1/1.414]">
                <Image
                  src="/poster.jpeg"
                  alt="OPEN MIND 2026 Official Lineup Poster"
                  fill
                  priority
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                />

                {/* Glass Light Reflection Sheen */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity duration-300" />
              </div>

              {/* Click to Zoom Hover Overlay */}
              <div className="absolute inset-0 bg-navy-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                <span className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-5 py-2.5 text-xs font-bold text-navy-950 shadow-xl uppercase tracking-wider scale-95 group-hover:scale-100 transition-transform duration-300">
                  <Maximize2 className="h-4 w-4" />
                  <span>Perbesar Poster</span>
                </span>
              </div>
            </div>

            {/* Corner Gold Ornaments */}
            <div className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-gold-300 border-2 border-navy-950 shadow-md" />
            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gold-300 border-2 border-navy-950 shadow-md" />
            <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 rounded-full bg-gold-300 border-2 border-navy-950 shadow-md" />
            <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full bg-gold-300 border-2 border-navy-950 shadow-md" />
          </div>
        </motion.div>

        {/* ================= ROTATING CIRCULAR STAGE (Panggung Bulat yang Muter) ================= */}
        <div className="relative -mt-10 sm:-mt-14 w-full max-w-[500px] sm:max-w-[650px] h-[160px] sm:h-[200px] flex items-center justify-center pointer-events-none">
          {/* Spotlight Floor Reflection Circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-[480px] h-28 sm:h-36 rounded-[100%] bg-gold-400/25 blur-xl" />

          {/* 3D Perspective Stage Wrapper */}
          <div
            className="relative w-full h-full flex items-center justify-center"
            style={{ perspective: "1000px" }}
          >
            {/* Outer Stage Cylinder Edge */}
            <div
              className="absolute w-[340px] sm:w-[480px] md:w-[560px] h-[130px] sm:h-[160px] rounded-[100%] border-[6px] border-gold-600/40 bg-gradient-to-b from-navy-900/90 via-navy-950 to-black shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
              style={{ transform: "rotateX(68deg)" }}
            />

            {/* Middle Rotating Gold Ring with Segment Marks */}
            <div
              className="absolute w-[320px] sm:w-[450px] md:w-[520px] h-[120px] sm:h-[150px] rounded-[100%] border-2 border-dashed border-gold-400/60 animate-[spin_16s_linear_infinite]"
              style={{ transform: "rotateX(68deg)" }}
            />

            {/* Inner Rotating Ornamental Gold Ring (Opposite direction) */}
            <div
              className="absolute w-[280px] sm:w-[390px] md:w-[460px] h-[100px] sm:h-[130px] rounded-[100%] border-[3px] border-gold-500/80 shadow-[0_0_25px_rgba(201,162,74,0.4)] animate-[spin_24s_linear_infinite_reverse]"
              style={{ transform: "rotateX(68deg)" }}
            >
              {/* Rotating Gold Accent Bevels */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gold-300 shadow-md" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gold-300 shadow-md" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gold-300 shadow-md" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gold-300 shadow-md" />
            </div>

            {/* Stage Center Glowing Platform */}
            <div
              className="absolute w-[240px] sm:w-[330px] md:w-[390px] h-[80px] sm:h-[110px] rounded-[100%] bg-gradient-to-r from-gold-500/20 via-gold-300/30 to-gold-500/20 border border-gold-300/40"
              style={{ transform: "rotateX(68deg)" }}
            />
          </div>
        </div>

        {/* Stage Action Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 z-20">
          <Link
            href="/tiket"
            className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-6 py-3 text-sm font-bold text-navy-950 hover:bg-gold-400 transition-all duration-300 shadow-lg shadow-gold-500/20 hover:scale-105"
          >
            <Ticket className="h-4 w-4" />
            <span>Pesan Tiket Sekarang</span>
          </Link>

          <a
            href="/poster.jpeg"
            download="OPEN_MIND_2026_Poster.jpeg"
            className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-navy-900/80 px-6 py-3 text-sm font-semibold text-ivory-100 hover:bg-gold-500/10 hover:border-gold-500 transition-all duration-300 backdrop-blur-md"
          >
            <Download className="h-4 w-4 text-gold-400" />
            <span>Unduh Poster Resmi</span>
          </a>
        </div>
      </div>

      {/* ================= FULLSCREEN POSTER MODAL ================= */}
      {isZoomed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-navy-950/95 backdrop-blur-xl">
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-5 right-5 z-50 rounded-full bg-navy-900/90 p-3 text-ivory-100 border border-gold-500/40 hover:bg-gold-500 hover:text-navy-950 transition-colors shadow-2xl"
            aria-label="Tutup poster"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="relative max-w-2xl max-h-[85vh] aspect-[1/1.414] w-full rounded-2xl overflow-hidden border-2 border-gold-500 shadow-2xl shadow-gold-500/20">
            <Image
              src="/poster.jpeg"
              alt="OPEN MIND 2026 Lineup Poster Full"
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
