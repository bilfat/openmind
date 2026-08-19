"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { mockFAQs } from "@/data/faq";
import {
  Search,
  ChevronDown,
  Sparkles,
  HelpCircle,
  Ticket,
  CreditCard,
  CalendarDays,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { useActiveEvent } from "@/hooks/use-active-event";
import { eventDisplayName } from "@/lib/event-utils";
import { cn } from "@/lib/utils";
import Link from "next/link";

const categoryMeta: Record<string, { icon: React.ElementType; label: string }> = {
  all: { icon: Sparkles, label: "Semua" },
  general: { icon: HelpCircle, label: "Umum" },
  ticketing: { icon: Ticket, label: "Tiket" },
  payment: { icon: CreditCard, label: "Pembayaran" },
  "event-day": { icon: CalendarDays, label: "Hari-H" },
};

const categories = ["all", "general", "ticketing", "payment", "event-day"];

const sparklePositions = [
  { top: "12%", left: "8%", delay: 0 },
  { top: "22%", right: "10%", delay: 1.2 },
  { top: "60%", left: "5%", delay: 0.6 },
  { top: "70%", right: "7%", delay: 1.8 },
  { top: "40%", left: "46%", delay: 2.4 },
  { top: "15%", right: "30%", delay: 0.3 },
];

export function FaqSection() {
  const { event } = useActiveEvent();
  const displayName = eventDisplayName(event);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openAccordion, setOpenAccordion] = useState<string | null>(mockFAQs[0]?.id || null);

  const filteredFAQs = mockFAQs.filter(
    (faq) =>
      (activeCategory === "all" || faq.category === activeCategory) &&
      (faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleAccordion = (id: string) => {
    setOpenAccordion(openAccordion === id ? null : id);
  };

  return (
    <section id="faq" className="relative overflow-hidden bg-secondary/30 py-24 sm:py-32">
      {/* Decorative background */}
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-gold-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-24 h-80 w-80 rounded-full bg-gold-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#C9A24A_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.04]" />

      <div className="relative mx-auto max-w-4xl px-6 lg:px-8">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center"
        >
          <SectionHeading
            badge="Tanya Jawab"
            title="Pertanyaan Umum (FAQ)"
            subtitle={`Temukan jawaban untuk semua pertanyaan Anda tentang ${displayName}. Jika tidak menemukan jawaban, hubungi kami.`}
          />
        </motion.div>

        {/* Gilded Stage Panel */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative mt-12 overflow-hidden rounded-[2rem] border border-gold-500/25 bg-navy-950 p-5 shadow-2xl shadow-navy-950/30 sm:p-8"
        >
          {/* Stage inner glow + texture */}
          <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-gold-500/20 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(232,207,138,0.1)_1px,transparent_1px)] [background-size:26px_26px]" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gold-500/10 to-transparent" />

          {/* Floating gold sparkles */}
          {sparklePositions.map((pos, i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-gold-300"
              style={pos as React.CSSProperties}
              animate={{ y: [0, -12, 0], opacity: [0.2, 0.8, 0.2] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: pos.delay }}
            />
          ))}

          {/* Search and Filter */}
          <div className="relative space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gold-400" />
              <input
                type="text"
                placeholder="Cari pertanyaan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full border border-gold-500/30 bg-navy-900/80 py-3 pl-12 pr-4 text-ivory-100 placeholder:text-ivory-200/40 transition-all duration-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {categories.map((cat) => {
                const active = activeCategory === cat;
                const Icon = categoryMeta[cat].icon;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      active ? "text-navy-950" : "text-ivory-200/80 hover:bg-gold-500/10 hover:text-ivory-100"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="faq-category-pill"
                        className="absolute inset-0 rounded-full bg-gold-500 shadow-lg shadow-gold-500/30"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="relative z-10">{categoryMeta[cat].label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accordion */}
          <div className="relative mt-6 space-y-3">
            {filteredFAQs.length > 0 ? (
              filteredFAQs.map((faq, idx) => {
                const open = openAccordion === faq.id;
                const CatIcon = categoryMeta[faq.category].icon;
                return (
                  <motion.div
                    key={faq.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.45, delay: idx * 0.06, ease: "easeOut" }}
                  >
                    <div
                      className={cn(
                        "group relative overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-300",
                        open
                          ? "border-gold-500/60 bg-navy-800/90 shadow-[0_0_30px_rgba(201,162,74,0.15)]"
                          : "border-gold-500/15 bg-navy-900/80 hover:border-gold-500/40 hover:bg-navy-800/70"
                      )}
                    >
                      {/* Gold accent line when open */}
                      <div
                        className={cn(
                          "absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-gold-300 via-gold-500 to-transparent transition-opacity duration-300",
                          open ? "opacity-100" : "opacity-0"
                        )}
                      />

                      <button
                        onClick={() => toggleAccordion(faq.id)}
                        className="flex w-full items-center gap-4 p-5 text-left sm:p-6"
                        aria-expanded={open}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-500 to-gold-400 font-display text-sm font-black text-navy-950 shadow-lg shadow-gold-500/20">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-gold-400/80">
                            <CatIcon className="h-3 w-3" />
                            {categoryMeta[faq.category].label}
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 block font-display text-base font-bold text-ivory-100 transition-colors duration-300 sm:text-lg",
                              !open && "group-hover:text-gold-300"
                            )}
                          >
                            {faq.question}
                          </span>
                        </span>
                        <motion.span
                          animate={{ rotate: open ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                            open
                              ? "border-gold-500/60 bg-gold-500/10 text-gold-400"
                              : "border-gold-500/25 text-gold-400"
                          )}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </motion.span>
                      </button>

                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            key="content"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                            className="overflow-hidden"
                          >
                            <p className="px-5 pb-6 pl-[4.75rem] text-sm leading-relaxed text-ivory-200/75 sm:px-6 sm:pl-[5.25rem]">
                              {faq.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-dashed border-gold-500/25 bg-navy-900/60 py-14 text-center"
              >
                <HelpCircle className="mx-auto h-10 w-10 text-gold-500/50" />
                <p className="mt-3 text-sm text-ivory-200/70">
                  Tidak ada pertanyaan yang cocok dengan pencarian Anda.
                </p>
              </motion.div>
            )}
          </div>

          {/* Still have questions CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="relative mt-6 overflow-hidden rounded-2xl border border-gold-500/25 bg-gradient-to-r from-navy-900 to-navy-800 p-6 text-center sm:p-8"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-500/10 blur-2xl" />
            <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:text-left">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-gold-500/30 bg-gold-500/15 text-gold-400">
                  <MessageCircle className="h-7 w-7" />
                </span>
                <div>
                  <h3 className="font-display text-xl font-bold text-ivory-100">
                    Masih Punya Pertanyaan?
                  </h3>
                  <p className="mt-1 text-sm text-ivory-200/70">
                    Tim kami siap membantu Anda. Hubungi kami melalui kanal di bawah.
                  </p>
                </div>
              </div>
              <Link
                href="#kontak"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gold-500 px-6 py-3 text-sm font-bold text-navy-950 transition-all duration-300 hover:scale-105 hover:bg-gold-400 shadow-lg shadow-gold-500/20"
              >
                Hubungi Kami
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}