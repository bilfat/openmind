"use client";

import Link from "next/link";
import { useState } from "react";
import { eventData } from "@/data/event";
import { mockTalents, TalentItem } from "@/data/talents";
import { mockTickets } from "@/data/tickets";
import { mockFAQs } from "@/data/faq";
import { CountdownTimer } from "@/components/landing/countdown-timer";
import { SectionHeading } from "@/components/ui/section-heading";
import { GoldDivider } from "@/components/ui/gold-divider";
import { PosterStage } from "@/components/landing/poster-stage";
import { TicketVoucherCard } from "@/components/ticket/ticket-voucher-card";
import {
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  Lightbulb,
  Users,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Building,
  HelpCircle,
} from "lucide-react";

export default function BerandaPage() {
  const [selectedTalent, setSelectedTalent] = useState<TalentItem | null>(null);

  const valueIcons: Record<string, React.ElementType> = {
    Lightbulb,
    Users,
    Sparkles,
    TrendingUp,
  };

  return (
    <>
      {/* ================= HERO SECTION (Dark Cinematic) ================= */}
      <section className="relative min-h-screen flex items-center justify-center bg-navy-950 overflow-hidden pt-24 pb-20">
        {/* Background Gradients & Glow Layers */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[400px] bg-gold-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#C9A24A_1px,transparent_1px)] [background-size:32px_32px] opacity-10" />

        {/* Hero Main Content */}
        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center space-y-8">
          {/* Organizer Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-navy-900/80 px-4 py-1.5 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-gold-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
              HIPMI PT TELKOM UNIVERSITY PRESENTS
            </span>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-wider text-ivory-100 drop-shadow-2xl">
              OPEN MIND
            </h1>
            <p className="font-display text-2xl sm:text-4xl md:text-5xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500">
              2026
            </p>
          </div>

          {/* Tagline */}
          <p className="mx-auto max-w-2xl text-lg sm:text-2xl font-light text-ivory-200/90 leading-relaxed italic">
            &ldquo;One Action Endless Impact&rdquo;
          </p>

          {/* Event Meta Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-ivory-200/80">
            <div className="flex items-center gap-2 rounded-full bg-navy-900/80 border border-gold-500/20 px-4 py-2 backdrop-blur-md">
              <Calendar className="h-4 w-4 text-gold-400" />
              <span>{eventData.date}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-navy-900/80 border border-gold-500/20 px-4 py-2 backdrop-blur-md">
              <Clock className="h-4 w-4 text-gold-400" />
              <span>{eventData.time}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-navy-900/80 border border-gold-500/20 px-4 py-2 backdrop-blur-md">
              <MapPin className="h-4 w-4 text-gold-400" />
              <span>{eventData.venue}</span>
            </div>
          </div>

          {/* Live Countdown Timer */}
          <div className="pt-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gold-400/80 mb-3 font-semibold">
              COUNTDOWN TO EVENT
            </p>
            <CountdownTimer />
          </div>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/tiket"
              className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-8 py-4 text-sm sm:text-base font-bold text-navy-950 transition-all duration-300 hover:bg-gold-400 hover:scale-105 shadow-xl shadow-gold-500/20"
            >
              <span>Amankan Tiket Sekarang</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/tentang"
              className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-navy-900/60 px-8 py-4 text-sm sm:text-base font-semibold text-ivory-100 backdrop-blur-md transition-all duration-300 hover:bg-gold-500/10 hover:border-gold-500"
            >
              <span>Pelajari Lebih Lanjut</span>
            </Link>
          </div>
        </div>

        {/* Bottom Smooth Transition to White Content Area */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </section>

      {/* ================= VALUE PROPOSITION (Why OPEN MIND) ================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <SectionHeading
          badge="Mengapa Harus Hadir"
          title="Why OPEN MIND 2026?"
          subtitle="Event tahunan terbesar persembahan HIPMI Telkom University untuk mengakselerasi potensi kewirausahaan generasi muda."
        />

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {eventData.values.map((val, idx) => {
            const Icon = valueIcons[val.icon] || Sparkles;
            return (
              <div
                key={val.title}
                className="group relative rounded-3xl border border-border bg-white p-8 transition-all duration-300 hover:-translate-y-2 hover:border-gold-500 hover:shadow-xl hover:shadow-gold-500/10"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500/10 text-gold-600 transition-colors duration-300 group-hover:bg-gold-500 group-hover:text-navy-950">
                  <Icon className="h-7 w-7" />
                </div>
                <div className="text-xs font-bold text-gold-500 tracking-widest uppercase mb-1">
                  0{idx + 1}
                </div>
                <h3 className="font-display text-2xl font-bold text-navy-900 mb-3">
                  {val.title}
                </h3>
                <p className="text-sm leading-relaxed text-navy-900/70 font-light">
                  {val.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= THEATRICAL POSTER STAGE SHOWCASE ================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-10 space-y-3">
          <SectionHeading
            badge="Official Line-Up"
            title="Saksikan Line-Up Resmi OPEN MIND 2026"
            subtitle="Poster resmi persembahan HIPMI PT Telkom University. Klik poster untuk melihat detail secara penuh."
          />
        </div>
        <PosterStage />
      </section>

      {/* ================= TICKET VOUCHER PREVIEW ================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <SectionHeading
          badge="Katalog Tiket Resmi"
          title="Pilih Paket Tiket Anda"
          subtitle="Tersedia kuota Free Pass untuk mahasiswa serta paket Early Bird dengan merchandise eksklusif."
        />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
          {mockTickets.slice(0, 3).map((ticket) => (
            <TicketVoucherCard
              key={ticket.id}
              ticket={ticket}
              featured={ticket.id === "early-bird"}
            />
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/tiket"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-8 py-3.5 text-sm font-bold text-navy-900 hover:border-gold-500 hover:text-gold-600 transition-all shadow-sm"
          >
            <span>Buka Halaman Tiket Lengkap</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ================= MEET HIPMI BANNER ================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-navy-900 p-8 sm:p-12 lg:p-16 border border-gold-500/30 text-ivory-100 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold-500/10 px-3.5 py-1 text-xs font-semibold text-gold-400 border border-gold-500/20 uppercase tracking-widest">
              <Building className="h-3.5 w-3.5" />
              <span>Organizer Profile</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ivory-100">
              HIPMI PT Telkom University
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-ivory-200/80 font-light">
              Wadah resmi pencetak wirausaha muda tangguh di lingkungan Telkom University. Melalui OPEN MIND 2026, kami mempertemukan inovator masa depan dengan ekosistem bisnis profesional.
            </p>
            <div className="pt-2">
              <Link
                href="/hipmi"
                className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-6 py-3 text-sm font-bold text-navy-950 hover:bg-gold-400 transition-all"
              >
                <span>Kenali Lebih Dekat HIPMI</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FAQ HIGHLIGHT ================= */}
      <section className="py-20 bg-secondary/30 border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Tanya Jawab"
            title="Pertanyaan Umum (FAQ)"
            subtitle="Semua hal yang sering ditanyakan seputar pendaftaran, tiket, dan acara OPEN MIND 2026."
          />

          <div className="mt-12 space-y-4">
            {mockFAQs.slice(0, 4).map((faq) => (
              <div
                key={faq.id}
                className="rounded-2xl border border-border bg-white p-6 shadow-sm"
              >
                <h3 className="font-display text-lg font-bold text-navy-900 mb-2 flex items-start gap-3">
                  <HelpCircle className="h-5 w-5 text-gold-500 flex-shrink-0 mt-0.5" />
                  <span>{faq.question}</span>
                </h3>
                <p className="text-sm leading-relaxed text-navy-900/70 pl-8 font-light">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 text-sm font-bold text-gold-600 hover:text-gold-500"
            >
              <span>Lihat Semua Pertanyaan di FAQ</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
