"use client";

import { useState, useEffect, useRef } from "react";
import { motion, animate, useInView, type Variants } from "framer-motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { eventData } from "@/data/event";
import {
  Lightbulb,
  Users,
  Sparkles,
  TrendingUp,
  Mic,
  CalendarDays,
  Clock,
  MapPin,
  Star,
} from "lucide-react";
import { TalentItem } from "@/data/talents";
import { TalentCard } from "@/components/landing/talent-card";
import { TalentModal } from "@/components/landing/talent-modal";
import { useActiveEvent } from "@/hooks/use-active-event";
import {
  eventDisplayName,
  speakerToTalent,
  formatEventDate,
  formatEventTimeRange,
} from "@/lib/event-utils";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

function StatCounter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value]);

  return <span ref={ref}>{display}</span>;
}

export default function TentangPage() {
  const { event, speakers, agenda } = useActiveEvent();
  const [selectedTalent, setSelectedTalent] = useState<TalentItem | null>(null);

  const valueIcons: Record<string, React.ElementType> = {
    Lightbulb,
    Users,
    Sparkles,
    TrendingUp,
  };

  const displayName = eventDisplayName(event);
  const about = event?.description || eventData.about;

  const talentList = [...speakers]
    .filter((s) => s.is_visible)
    .sort((a, b) => a.display_order - b.display_order)
    .map(speakerToTalent);
  const keynoteSpeakers = talentList.filter((t) => t.role === "speaker");
  const moderators = talentList.filter((t) => t.role === "moderator");
  const mcs = talentList.filter((t) => t.role === "mc");
  const supportCrew = [...moderators, ...mcs];

  const visibleAgenda = agenda
    ? agenda.filter((a) => a.is_visible).sort((a, b) => a.session_order - b.session_order)
    : [];

  const dateLabel = event?.event_date ? formatEventDate(event.event_date) : eventData.date;
  const timeLabel = event?.event_date
    ? formatEventTimeRange(event.start_time, event.end_time)
    : eventData.time;
  const venueLabel = event?.venue || eventData.venue;

  const start = (event?.start_time ?? "").slice(0, 5) || "09:00";
  const end = (event?.end_time ?? "").slice(0, 5) || "17:00";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const durationHours = Math.round((eh * 60 + em - sh * 60 - sm) / 60);
  const durationLabel = durationHours > 0 ? `${durationHours} Jam` : "1 Hari";

  const stats: {
    icon: React.ElementType;
    label: string;
    count?: number;
    text?: string;
  }[] = [
    {
      icon: Mic,
      label: "Pembicara & Host",
      count: talentList.length,
      text: "Segera",
    },
    {
      icon: CalendarDays,
      label: "Sesi Program",
      count: visibleAgenda.length,
      text: "Segera",
    },
    { icon: Clock, label: "Durasi Acara", text: durationLabel },
    { icon: MapPin, label: "Lokasi Acara", text: venueLabel },
  ];

  return (
    <>
      <div className="bg-white">
        {/* ================= HERO / TENTANG ================= */}
        <section className="relative overflow-hidden bg-white pb-16 pt-20 sm:pb-24 sm:pt-28">
          {/* Decorative Background */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gold-500/10 via-white to-white" />
          <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[720px] -translate-x-1/2 rounded-full bg-gold-400/20 blur-[120px]" />
          <div className="pointer-events-none absolute right-0 top-1/3 h-64 w-64 rounded-full bg-gold-300/25 blur-[100px]" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-gold-500/10 blur-[100px]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#C9A24A_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.07]" />

          {/* Floating gold particles */}
          <div className="pointer-events-none absolute inset-0">
            <span className="absolute left-[12%] top-24 h-1.5 w-1.5 rounded-full bg-gold-400 animate-float-particle" />
            <span className="absolute right-[14%] top-16 h-2 w-2 rounded-full bg-gold-300 animate-float-particle" style={{ animationDelay: "1.4s" }} />
            <span className="absolute left-[22%] bottom-24 h-1 w-1 rounded-full bg-gold-500 animate-float-particle" style={{ animationDelay: "2.1s" }} />
            <span className="absolute right-[24%] bottom-32 h-1.5 w-1.5 rounded-full bg-ivory-200 animate-float-particle" style={{ animationDelay: "0.7s" }} />
          </div>

          <div className="relative mx-auto max-w-4xl px-6 text-center lg:px-8">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              {/* Badge */}
              <motion.div
                variants={fadeUp}
                className="glass inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-white/70 px-4 py-1.5 shadow-sm backdrop-blur-md"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-gold-500" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-navy-900">
                  Tentang Acara
                </span>
              </motion.div>

              {/* Title */}
              <motion.h1
                variants={fadeUp}
                className="font-display text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl lg:text-6xl"
              >
                Selamat Datang di{" "}
                <span className="text-gold-gradient">{displayName}</span>
              </motion.h1>

              {/* About */}
              <motion.p
                variants={fadeUp}
                className="mx-auto max-w-2xl text-base leading-relaxed text-navy-900/60 sm:text-lg"
              >
                {about}
              </motion.p>

              {/* Event Meta */}
              <motion.div
                variants={fadeUp}
                className="flex flex-wrap items-center justify-center gap-3 sm:gap-4"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/25 bg-white/70 px-4 py-2 text-sm font-medium text-navy-900/80 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-500 hover:shadow-lg hover:shadow-gold-500/10">
                  <CalendarDays className="h-4 w-4 text-gold-500" />
                  <span>{dateLabel}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/25 bg-white/70 px-4 py-2 text-sm font-medium text-navy-900/80 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-500 hover:shadow-lg hover:shadow-gold-500/10">
                  <Clock className="h-4 w-4 text-gold-500" />
                  <span>{timeLabel}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/25 bg-white/70 px-4 py-2 text-sm font-medium text-navy-900/80 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-500 hover:shadow-lg hover:shadow-gold-500/10">
                  <MapPin className="h-4 w-4 text-gold-500" />
                  <span>{venueLabel}</span>
                </div>
              </motion.div>

              {/* Scroll Indicator */}
              <motion.div variants={fadeUp} className="flex justify-center pt-2">
                <div
                  className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-gold-500/40 pt-1.5"
                  aria-hidden="true"
                >
                  <motion.span
                    animate={{ y: [0, 4, 0], opacity: [1, 0.2, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="block h-2 w-1 rounded-full bg-gold-500"
                  />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" />
        </div>

        {/* ================= NILAI & FILOSOFI ================= */}
        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="mx-auto max-w-3xl text-center"
            >
              <SectionHeading
                badge="Nilai & Filosofi"
                title={`Apa yang Membuat ${displayName} Istimewa?`}
                subtitle="Empat pilar utama yang membentuk pengalaman seminar dan networking yang dirancang untuk memperluas perspektifmu."
              />
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
            >
              {eventData.values.map((value, idx) => {
                const Icon = valueIcons[value.icon] || Sparkles;
                return (
                  <motion.div
                    key={value.title}
                    variants={fadeUp}
                    className="group relative overflow-hidden rounded-3xl border border-border bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-gold-500/60 hover:shadow-xl hover:shadow-gold-500/10"
                  >
                    <div className="pointer-events-none absolute -right-5 -top-7 font-display text-8xl font-black text-gold-500/5 transition-colors duration-300 group-hover:text-gold-500/15">
                      0{idx + 1}
                    </div>
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500/10 text-gold-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-gold-500 group-hover:text-white">
                      <Icon className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-navy-900">
                      {value.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-navy-900/60">
                      {value.description}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ================= STATISTIK ACARA ================= */}
        <section className="relative overflow-hidden bg-navy-950 py-16 sm:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,162,74,0.14)_0%,transparent_60%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#C9A24A_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.06]" />
          <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[500px] -translate-x-1/2 rounded-full bg-gold-500/10 blur-[100px]" />
          <div className="pointer-events-none absolute inset-0">
            <span className="absolute left-[10%] top-1/4 h-1.5 w-1.5 rounded-full bg-gold-400 animate-float-particle" />
            <span className="absolute right-[12%] top-1/3 h-2 w-2 rounded-full bg-gold-300 animate-float-particle" style={{ animationDelay: "1.6s" }} />
            <span className="absolute left-[20%] bottom-1/4 h-1 w-1 rounded-full bg-gold-500 animate-float-particle" style={{ animationDelay: "0.9s" }} />
            <span className="absolute right-[22%] bottom-1/3 h-1.5 w-1.5 rounded-full bg-ivory-200 animate-float-particle" style={{ animationDelay: "2.3s" }} />
          </div>

          <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="grid grid-cols-2 gap-8 md:grid-cols-4"
            >
              {stats.map((stat) => (
                <motion.div key={stat.label} variants={fadeUp} className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-gold-500/30 bg-gold-500/10">
                    <stat.icon className="h-5 w-5 text-gold-400" />
                  </div>
                  <div className="font-display text-2xl font-bold text-gold-gradient tabular-nums sm:text-3xl">
                    {stat.count !== undefined && stat.count > 0 ? (
                      <StatCounter value={stat.count} />
                    ) : (
                      <span>{stat.text}</span>
                    )}
                  </div>
                  <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ivory-200/60">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ================= PEMBICARA ================= */}
        <section className="relative overflow-hidden bg-secondary/30 py-20 sm:py-28">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
          <div className="pointer-events-none absolute -left-24 top-32 h-72 w-72 rounded-full bg-gold-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-32 h-72 w-72 rounded-full bg-gold-500/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#C9A24A_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.04]" />
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="mx-auto max-w-3xl text-center"
            >
              <SectionHeading
                badge="Line-up"
                title={`Bertemu Para Ahli di ${displayName}`}
                subtitle="Kami menghadirkan para pemimpin industri, praktisi bisnis, dan entrepreneur inspiratif untuk berbagi wawasan dan pengalaman."
              />
            </motion.div>

            {/* Keynote & Guest Speakers */}
            <div className="mt-16 sm:mt-20">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                className="mb-10 flex items-center justify-center gap-3"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/10 text-gold-500">
                  <Mic className="h-5 w-5" />
                </span>
                <h2 className="text-center font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
                  Keynote &amp; Guest Speakers
                </h2>
              </motion.div>

              {keynoteSpeakers.length > 0 ? (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  className="isolate grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
                >
                  {keynoteSpeakers.map((talent) => (
                    <motion.div key={talent.id} variants={fadeUp}>
                      <TalentCard
                        talent={talent}
                        onSelect={() => setSelectedTalent(talent)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.p
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  className="mt-8 text-center text-sm text-navy-900/50"
                >
                  Daftar pembicara akan segera diumumkan.
                </motion.p>
              )}
            </div>

            {/* Moderator & MC */}
            <div className="mt-16 sm:mt-20">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                className="mb-10 flex items-center justify-center gap-3"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/10 text-gold-500">
                  <Star className="h-5 w-5" />
                </span>
                <h2 className="text-center font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
                  Moderator &amp; MC
                </h2>
              </motion.div>

              {supportCrew.length > 0 ? (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  className="isolate grid grid-cols-1 gap-8 md:grid-cols-3"
                >
                  {supportCrew.map((talent) => (
                    <motion.div key={talent.id} variants={fadeUp}>
                      <TalentCard
                        talent={talent}
                        onSelect={() => setSelectedTalent(talent)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.p
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  className="mt-8 text-center text-sm text-navy-900/50"
                >
                  Daftar moderator &amp; MC akan segera diumumkan.
                </motion.p>
              )}
            </div>
          </div>
        </section>
      </div>

      {selectedTalent && (
        <TalentModal
          talent={selectedTalent}
          onClose={() => setSelectedTalent(null)}
        />
      )}
    </>
  );
}