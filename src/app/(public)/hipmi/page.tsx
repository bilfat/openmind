"use client";

import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  Building,
  Award,
  Users,
  Zap,
  ArrowRight,
  Sparkles,
  Target,
  Ticket,
  HeartHandshake,
  Quote,
} from "lucide-react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const activityPillars = [
  {
    icon: Award,
    title: "Kompetisi & Prestasi",
    description: "Mendorong anggota untuk berpartisipasi dan menjuarai berbagai kompetisi bisnis tingkat nasional dan internasional.",
  },
  {
    icon: Users,
    title: "Networking & Kolaborasi",
    description: "Menghubungkan mahasiswa dengan ekosistem startup, investor, dan praktisi industri melalui event eksklusif.",
  },
  {
    icon: Zap,
    title: "Inkubasi & Akselerasi",
    description: "Menyediakan program inkubasi untuk ide bisnis dari nol hingga validasi pasar dan siap untuk pendanaan.",
  },
  {
    icon: Building,
    title: "Kunjungan Industri",
    description: "Memberikan wawasan langsung ke dalam operasional perusahaan teknologi dan startup terkemuka di Indonesia.",
  },
];

const pillars = [
  { icon: Target, title: "Visi Kami", text: "Mewujudkan HIPMI PT TELKOM sebagai ekosistem pengusaha muda yang adaptif, kolaboratif, dan inovatif melalui penguatan digital entrepreneurship, perluasan jejaring eksternal yang strategis, serta terciptanya kader berprestasi guna menciptakan nilai wirausaha yang berkelanjutan bagi setiap kader HIPMI PT TELKOM." },
  {
  icon: HeartHandshake,
  title: "Misi Kami",
  text: `1. Menciptakan ekosistem yang kolaboratif dan inovatif.
2. Mendorong percepatan digitalisasi bagi entrepreneur serta organisasi.
3. Membangun jejaring eksternal yang kuat dan strategis.
4. Mendorong kader untuk aktif berkompetisi guna menciptakan kader yang berprestasi.
5. Meningkatkan nilai kewirausahaan berkelanjutan dalam rangka membangun jiwa kepemimpinan serta kepekaan terhadap tanggung jawab sosial.`,
},]

const particles = [
  { top: "10%", left: "6%", delay: 0 },
  { top: "22%", right: "10%", delay: 1.3 },
  { top: "60%", left: "5%", delay: 0.6 },
  { top: "72%", right: "7%", delay: 2.0 },
  { top: "38%", left: "52%", delay: 0.4 },
  { top: "16%", right: "32%", delay: 1.7 },
];

export default function HipmiPage() {
  return (
    <div className="bg-navy-950">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden bg-navy-950 px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-28 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950" />
        <div className="absolute left-1/2 top-0 h-80 w-[700px] -translate-x-1/2 rounded-full bg-gold-500/10 blur-[130px]" />
        <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-burgundy-600/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#C9A24A_1px,transparent_1px)] [background-size:28px_28px] opacity-10" />

        {particles.map((pos, i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-gold-300"
            style={pos as React.CSSProperties}
            animate={{ y: [0, -12, 0], opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: pos.delay }}
          />
        ))}

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold-400 backdrop-blur-md"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse" />
            <span>Organizer Profile</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 font-display text-4xl font-black tracking-tight sm:text-5xl lg:text-7xl"
          >
            <span className="text-gold-gradient">HIPMI</span>{" "}
            <span className="text-ivory-100">PT Telkom</span>
            <br className="hidden sm:block" />
            <span className="text-ivory-100">University</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-base font-light leading-relaxed text-ivory-200/75 sm:text-lg"
          >
            Wadah resmi pencetak wirausaha muda tangguh di lingkungan Telkom University. Kami berkomitmen untuk membangun ekosistem bisnis yang inovatif, kolaboratif, dan berdaya saing tinggi.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href="/tiket"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-500 to-gold-400 px-7 py-3.5 text-sm font-black text-navy-950 shadow-lg shadow-gold-500/30 transition-all duration-300 hover:scale-105 hover:brightness-110"
            >
              <Ticket className="h-4 w-4" />
              <span>Amankan Tiket Sekarang</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-white/5 px-7 py-3.5 text-sm font-semibold text-ivory-100 backdrop-blur-md transition-all duration-300 hover:border-gold-500 hover:bg-gold-500/10"
            >
              <Sparkles className="h-4 w-4 text-gold-400" />
              <span>Jelajahi Event Kami</span>
            </Link>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mt-14 flex justify-center"
          >
            <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-gold-500/40 pt-1.5" aria-hidden="true">
              <motion.span
                animate={{ y: [0, 4, 0], opacity: [1, 0.2, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="block h-2 w-1 rounded-full bg-gold-500"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= PILAR AKTIVITAS (Glass) ================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 px-4 py-20 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(201,162,74,0.08),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_85%,rgba(104,31,43,0.08),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#C9A24A_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.05]" />

        <div className="relative mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <SectionHeading
              dark
              badge="Aktivitas Unggulan"
              title="Empat Pilar Aktivitas"
              subtitle="Program-program yang kami rancang untuk mengembangkan jiwa wirausaha mahasiswa secara menyeluruh."
            />
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {activityPillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <motion.div
                  key={pillar.title}
                  variants={fadeUp}
                  className="glass-ios glass-sheen group relative overflow-hidden rounded-3xl p-8"
                >
                  <div className="pointer-events-none absolute -right-4 -top-6 font-display text-8xl font-black text-white/[0.04] transition-colors duration-300 group-hover:text-gold-500/20">
                    0{idx + 1}
                  </div>
                  <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-500 to-gold-400 text-navy-950 shadow-lg shadow-gold-500/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <Icon className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <h3 className="relative font-display text-xl font-bold text-ivory-100">
                    {pillar.title}
                  </h3>
                  <p className="relative mt-2.5 text-sm leading-relaxed text-ivory-200/70">
                    {pillar.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ================= MISI & NILAI ================= */}
      <section className="relative overflow-hidden bg-navy-950 px-4 py-20 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-500/10 blur-[120px]" />

        <div className="relative mx-auto max-w-5xl">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 gap-8 md:grid-cols-2"
          >
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.title}
                  variants={fadeUp}
                  className="group relative overflow-hidden rounded-3xl border border-gold-500/20 bg-gradient-to-b from-navy-800/80 to-navy-900/80 p-8 backdrop-blur-md sm:p-10"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-60" />
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold-500/30 bg-gold-500/10 text-gold-400 transition-all duration-300 group-hover:bg-gold-500 group-hover:text-navy-950">
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-ivory-100">{p.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ivory-200/70">{p.text}</p>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Quote band */}
          <motion.figure
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="relative mx-auto mt-14 max-w-3xl text-center"
          >
            <Quote className="mx-auto h-10 w-10 rotate-180 text-gold-500/40" aria-hidden="true" />
            <blockquote className="mt-4 font-display text-2xl font-bold leading-snug text-gold-gradient sm:text-3xl">
              &ldquo; Pengusaha Pejuang, Pejuang Pengusaha.&rdquo;
            </blockquote>
            <figcaption className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-ivory-200/50">
              — HIPMI PT Telkom University
            </figcaption>
          </motion.figure>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="gold-border-animated relative mx-auto max-w-5xl rounded-[2rem] p-[1.5px]"
        >
          <div className="relative overflow-hidden rounded-[calc(2rem-1.5px)] bg-gradient-to-br from-navy-800 to-navy-950 p-10 text-center sm:p-14">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-gold-500/10 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#C9A24A_1px,transparent_1px)] [background-size:22px_22px] opacity-[0.06]" />

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative"
            >
              <h2 className="font-display text-3xl font-black tracking-tight text-ivory-100 sm:text-4xl">
                Bergabunglah Bersama Kami
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm font-light leading-relaxed text-ivory-200/75 sm:text-base">
                Jadilah bagian dari ekosistem wirausaha muda yang siap membawa perubahan. Amankan tiket Anda untuk menyaksikan langsung inspirasi dari para praktisi terbaik.
              </p>
              <Link
                href="/tiket"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-500 to-gold-400 px-8 py-4 text-sm font-black text-navy-950 shadow-xl shadow-gold-500/30 transition-all duration-300 hover:scale-105 hover:brightness-110"
              >
                <span>Amankan Tiket Sekarang</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}