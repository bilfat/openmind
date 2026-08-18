"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { eventData } from "@/data/event";
import { TalentItem } from "@/data/talents";
import { CountdownTimer } from "@/components/landing/countdown-timer";
import { SectionHeading } from "@/components/ui/section-heading";
import { PosterStage } from "@/components/landing/poster-stage";
import { TicketVoucherCard } from "@/components/ticket/ticket-voucher-card";
import { TalentCard } from "@/components/landing/talent-card";
import { TalentModal } from "@/components/landing/talent-modal";
import { useActiveEvent } from "@/hooks/use-active-event";
import { formatEventDate, formatEventTimeRange, eventDisplayName, speakerToTalent } from "@/lib/event-utils";
import {
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  Lightbulb,
  Users,
  Sparkles,
  TrendingUp,
  Building,
  HelpCircle,
  MessageSquare,
  Mic,
  Star,
} from "lucide-react";

const mockFAQs = [
  {
    id: "faq-1",
    question: "Apa itu OPEN MIND?",
    answer: "OPEN MIND adalah event tahunan terbesar persembahan HIPMI Telkom University untuk mengakselerasi potensi kewirausahaan generasi muda.",
  },
  {
    id: "faq-2",
    question: "Bagaimana cara mendaftar tiket?",
    answer: "Anda dapat mendaftar tiket melalui halaman Tiket di website ini. Pilih paket tiket yang sesuai dan ikuti langkah pendaftaran.",
  },
  {
    id: "faq-3",
    question: "Apakah ada tiket gratis?",
    answer: "Ya, tersedia kuota Free Pass untuk mahasiswa Telkom University. Kuota terbatas, segera daftar!",
  },
  {
    id: "faq-4",
    question: "Di mana acara dilaksanakan?",
    answer: "Detail lokasi acara akan dikirimkan setelah Anda mendaftar. Pastikan Anda bergabung dengan grup WhatsApp untuk update terbaru.",
  },
];

export default function BerandaPage() {
  const { event, speakers, agenda } = useActiveEvent();
  const [selectedTalent, setSelectedTalent] = useState<TalentItem | null>(null);
  const [homeTickets, setHomeTickets] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/tickets/public")
      .then(async (res) => {
        const json = await res.json();
        if (json.success) setHomeTickets(json.data.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  const valueIcons: Record<string, React.ElementType> = {
    Lightbulb,
    Users,
    Sparkles,
    TrendingUp,
  };

  const name = event?.name || "OPEN MIND";
  const year = event?.year || "2026";
  const displayName = eventDisplayName(event);
  const tagline = event?.tagline || event?.theme || eventData.tagline;
  const dateLabel = event?.event_date ? formatEventDate(event.event_date) : eventData.date;
  const timeLabel = event?.event_date ? formatEventTimeRange(event.start_time, event.end_time) : eventData.time;
  const venueLabel = event?.venue || eventData.venue;
  const heroTitle = event?.hero_title || null;
  const showYearSeparately = !event?.hero_title;
  const heroSubtitle = event?.hero_subtitle || tagline;

  const talentList = [...speakers]
    .filter((s) => s.is_visible)
    .sort((a, b) => a.display_order - b.display_order)
    .map(speakerToTalent);
  const keynoteSpeakers = talentList.filter((t) => t.role === "speaker");
  const supportCrew = talentList.filter((t) => t.role !== "speaker");

  const visibleAgenda = agenda
    ? agenda
        .filter((a) => a.is_visible)
        .sort((a, b) => a.session_order - b.session_order)
    : [];

  const whatsappGroupUrl = event?.whatsapp_group_url;

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
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-navy-900/80 px-3 sm:px-4 py-1.5 backdrop-blur-md max-w-full">
            <span className="h-2 w-2 rounded-full bg-gold-500 animate-pulse flex-shrink-0" />
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] sm:tracking-[0.25em] text-gold-400">
              HIPMI PT TELKOM UNIVERSITY PRESENTS
            </span>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="font-display text-4xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-wider text-ivory-100 drop-shadow-2xl break-words">
              {heroTitle ?? name}
            </h1>
            {showYearSeparately && (
              <p className="font-display text-2xl sm:text-4xl md:text-5xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500">
                {year}
              </p>
            )}
          </div>

          {/* Tagline */}
          <p className="mx-auto max-w-2xl text-lg sm:text-2xl font-light text-ivory-200/90 leading-relaxed italic">
            &ldquo;{heroSubtitle}&rdquo;
          </p>

          {/* Event Meta Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-ivory-200/80">
            <div className="flex items-center gap-2 rounded-full bg-navy-900/80 border border-gold-500/20 px-4 py-2 backdrop-blur-md">
              <Calendar className="h-4 w-4 text-gold-400" />
              <span>{dateLabel}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-navy-900/80 border border-gold-500/20 px-4 py-2 backdrop-blur-md">
              <Clock className="h-4 w-4 text-gold-400" />
              <span>{timeLabel}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-navy-900/80 border border-gold-500/20 px-4 py-2 backdrop-blur-md">
              <MapPin className="h-4 w-4 text-gold-400" />
              <span>{venueLabel}</span>
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
            {/* {whatsappGroupUrl && (
              <a
                href={whatsappGroupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-green-500 px-8 py-4 text-sm sm:text-base font-bold text-white transition-all duration-300 hover:bg-green-400 hover:scale-105 shadow-xl shadow-green-500/20"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Gabung Grup WhatsApp</span>
              </a>
            )} */}
          </div>
        </div>

        {/* Bottom Smooth Transition to White Content Area */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </section>

      {/* ================= VALUE PROPOSITION (Why OPEN MIND) ================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <SectionHeading
          badge="Mengapa Harus Hadir"
          title={`Why ${displayName}?`}
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
            title={`Saksikan Line-Up Resmi ${displayName}`}
            subtitle="Poster resmi persembahan HIPMI PT Telkom University. Klik poster untuk melihat detail secara penuh."
          />
        </div>
        <PosterStage />
      </section>

      {/* ================= SPEAKERS (LIVE FROM CMS) ================= */}
      {talentList.length > 0 && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-secondary/20 border-y border-border">
          <div className="text-center mb-12 space-y-3">
            <SectionHeading
              badge="Line-up"
              title={`Bertemu Para Ahli di ${displayName}`}
              subtitle="Kami menghadirkan para pemimpin industri, praktisi bisnis, dan entrepreneur inspiratif untuk berbagi wawasan dan pengalaman."
            />
          </div>

          {keynoteSpeakers.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl text-center font-display mb-8">
                <Mic className="inline-block h-6 w-6 text-gold-500 mr-2" />
                Keynote & Guest Speakers
              </h2>
              <div className="isolate grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {keynoteSpeakers.map((talent) => (
                  <TalentCard
                    key={talent.id}
                    talent={talent}
                    onSelect={() => setSelectedTalent(talent)}
                  />
                ))}
              </div>
            </div>
          )}

          {supportCrew.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl text-center font-display mb-8">
                <Star className="inline-block h-6 w-6 text-gold-500 mr-2" />
                Moderator & MC
              </h2>
              <div className="isolate grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {supportCrew.map((talent) => (
                  <TalentCard
                    key={talent.id}
                    talent={talent}
                    onSelect={() => setSelectedTalent(talent)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ================= AGENDA / RUNDOWN (LIVE FROM CMS) ================= */}
      {visibleAgenda.length > 0 && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <SectionHeading
            badge="Rundown"
            title="Agenda Acara"
            subtitle={`Jadwal lengkap sesi seminar, workshop, dan networking di ${displayName}.`}
          />
          <div className="mt-12 space-y-4">
            {visibleAgenda.map((item, idx) => (
              <div
                key={item.id}
                className="group flex items-start gap-4 sm:gap-6 rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold-500 hover:shadow-lg hover:shadow-gold-500/10"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-500/10 text-gold-600 font-display font-bold text-sm group-hover:bg-gold-500 group-hover:text-navy-950 transition-colors duration-300">
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-display text-lg font-bold text-navy-900 group-hover:text-gold-600 transition-colors">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-navy-900/70 font-light leading-relaxed">
                      {item.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-navy-900/60 pt-1">
                    {item.start_time && item.end_time && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gold-500" />
                        {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)} WIB
                      </span>
                    )}
                    {item.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-gold-500" />
                        {item.location}
                      </span>
                    )}
                    {item.speaker_id && (() => {
                      const sp = speakers.find((s) => s.id === item.speaker_id);
                      return sp ? (
                        <span className="inline-flex items-center gap-1">
                          <Mic className="h-3 w-3 text-gold-500" />
                          {sp.name}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================= TICKET VOUCHER PREVIEW ================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <SectionHeading
          badge="Katalog Tiket Resmi"
          title="Pilih Paket Tiket Anda"
          subtitle="Tersedia kuota Free Pass untuk mahasiswa serta paket Early Bird dengan merchandise eksklusif."
        />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
          {homeTickets.map((ticket) => (
            <TicketVoucherCard
              key={ticket.id}
              ticket={{
                id: ticket.id,
                name: ticket.name,
                description: ticket.description || "",
                type: ticket.ticket_type,
                visibility: ticket.visibility,
                price: Number(ticket.base_price),
                discountPercentage: Number(ticket.discount_percentage),
                finalPrice: Number(ticket.final_price),
                quota: Number(ticket.quota),
                issued: Number(ticket.quota) - Number(ticket.remaining_quota),
                minPurchase: Number(ticket.min_purchase),
                maxPurchase: Number(ticket.max_purchase),
                salesStart: ticket.sales_start_at,
                salesEnd: ticket.sales_end_at,
                status: ticket.status,
                benefits: ticket.benefits || [],
                badge: ticket.code === "EARLY" ? "Best Seller" : ticket.base_price === 0 ? "Limited Quota" : "Standard"
              }}
              featured={ticket.code === "EARLY"}
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
              Wadah resmi pencetak wirausaha muda tangguh di lingkungan Telkom University. Melalui {displayName}, kami mempertemukan inovator masa depan dengan ekosistem bisnis profesional.
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
            subtitle={`Semua hal yang sering ditanyakan seputar pendaftaran, tiket, dan acara ${displayName}.`}
          />

          <div className="mt-12 space-y-4">
            {mockFAQs.map((faq) => (
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

      {selectedTalent && (
        <TalentModal
          talent={selectedTalent}
          onClose={() => setSelectedTalent(null)}
        />
      )}
    </>
  );
}
