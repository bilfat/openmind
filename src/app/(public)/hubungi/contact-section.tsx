"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { MapPin, Phone, AtSign, Users, ArrowUpRight } from "lucide-react";

interface ContactSectionProps {
  venue: string;
  waHref: string;
  waDisplay: string;
  openMindIg: string;
  openMindTiktok: string;
  hipmiIg: string;
}

const IgIcon = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className || "h-6 w-6"} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.88a8.27 8.27 0 004.84 1.55V7a4.85 4.85 0 01-1.07-.31z" />
  </svg>
);

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

function ContactCard({ i, children, className }: { i: number; children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      custom={i}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ContactSection({
  venue,
  waHref,
  waDisplay,
  openMindIg,
  openMindTiktok,
  hipmiIg,
}: ContactSectionProps) {
  return (
    <section id="kontak" className="relative overflow-hidden bg-secondary/30 py-24 scroll-mt-20 sm:py-32">
      {/* Decorative background */}
      <div className="pointer-events-none absolute -left-20 top-16 h-72 w-72 rounded-full bg-gold-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-16 h-72 w-72 rounded-full bg-gold-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#C9A24A_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.04]" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto max-w-2xl text-center"
        >
          <SectionHeading
            badge="Get in Touch"
            title="Hubungi Kami"
            subtitle="Punya pertanyaan atau butuh informasi lebih lanjut? Jangan ragu untuk menghubungi kami melalui kanal di bawah ini."
          />
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 md:max-w-none md:grid-cols-2">
          {/* OPEN MIND Sosmed */}
          <ContactCard
            i={0}
            className="group relative overflow-hidden rounded-3xl bg-white p-8 shadow-sm ring-1 ring-inset ring-gold-500/15 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-gold-500/15 hover:ring-gold-500/40"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-500 to-gold-400 text-navy-950 shadow-lg shadow-gold-500/20 transition-transform duration-300 group-hover:scale-110">
                <AtSign className="h-6 w-6" />
              </div>
              <h3 className="font-display text-2xl font-bold text-navy-900">Follow OPEN MIND</h3>
              <p className="mt-2 text-sm text-gray-600">Dapatkan update terbaru seputar acara.</p>
              <div className="mt-6 flex items-center gap-4">
                <Link
                  href={openMindIg}
                  target="_blank"
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary text-navy-800 transition-all duration-300 hover:scale-110 hover:border-transparent hover:bg-gradient-to-tr hover:from-purple-600 hover:via-pink-500 hover:to-orange-400 hover:text-white hover:shadow-lg"
                  title="Instagram OPEN MIND"
                >
                  <IgIcon className="h-5 w-5" />
                </Link>
                <Link
                  href={openMindTiktok}
                  target="_blank"
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary text-navy-800 transition-all duration-300 hover:scale-110 hover:border-navy-900 hover:bg-navy-900 hover:text-white hover:shadow-lg"
                  title="TikTok OPEN MIND"
                >
                  <TikTokIcon className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </ContactCard>

          {/* HIPMI Sosmed */}
          <ContactCard
            i={1}
            className="group relative overflow-hidden rounded-3xl bg-white p-8 shadow-sm ring-1 ring-inset ring-gold-500/15 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-gold-500/15 hover:ring-gold-500/40"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-500 to-gold-400 text-navy-950 shadow-lg shadow-gold-500/20 transition-transform duration-300 group-hover:scale-110">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-display text-2xl font-bold text-navy-900">Jejaring HIPMI Tel-U</h3>
              <p className="mt-2 text-sm text-gray-600">Kenali lebih dekat organisasi kami.</p>
              <div className="mt-6 flex items-center gap-4">
                <Link
                  href={hipmiIg}
                  target="_blank"
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary text-navy-800 transition-all duration-300 hover:scale-110 hover:border-transparent hover:bg-gradient-to-tr hover:from-purple-600 hover:via-pink-500 hover:to-orange-400 hover:text-white hover:shadow-lg"
                  title="Instagram HIPMI Tel-U"
                >
                  <IgIcon className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </ContactCard>

          {/* WhatsApp */}
          <ContactCard
            i={2}
            className="group relative overflow-hidden rounded-3xl bg-white p-8 shadow-sm ring-1 ring-inset ring-gold-500/15 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-gold-500/15 hover:ring-gold-500/40"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative flex items-start gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gold-500/10 text-gold-600 ring-1 ring-inset ring-gold-500/25 transition-all duration-300 group-hover:scale-110 group-hover:bg-gold-500 group-hover:text-navy-950">
                <Phone className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-xl font-bold text-navy-900">Contact Person (WhatsApp)</h3>
                <p className="mt-1 text-sm text-gray-600">Untuk pertanyaan seputar tiket &amp; acara.</p>
                <Link
                  href={waHref}
                  target="_blank"
                  className="mt-3 inline-flex items-center gap-1.5 text-base font-bold text-gold-600 transition-colors hover:text-gold-500"
                >
                  {waDisplay}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </ContactCard>

          {/* Venue */}
          <ContactCard
            i={3}
            className="group relative overflow-hidden rounded-3xl bg-white p-8 shadow-sm ring-1 ring-inset ring-gold-500/15 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-gold-500/15 hover:ring-gold-500/40"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative flex items-start gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gold-500/10 text-gold-600 ring-1 ring-inset ring-gold-500/25 transition-all duration-300 group-hover:scale-110 group-hover:bg-gold-500 group-hover:text-navy-950">
                <MapPin className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-xl font-bold text-navy-900">Venue Acara</h3>
                <p className="mt-1 text-sm text-gray-600">{venue}, Bandung, Indonesia</p>
                <Link
                  href="https://maps.app.goo.gl/telkom-university"
                  target="_blank"
                  className="mt-3 inline-flex items-center gap-1.5 text-base font-bold text-gold-600 transition-colors hover:text-gold-500"
                >
                  Lihat di Google Maps
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </ContactCard>
        </div>
      </div>
    </section>
  );
}