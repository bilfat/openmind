"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Menu, X, Ticket, Search, LogIn } from "lucide-react";
import { MobileMenu } from "./mobile-menu";
import { useActiveEvent } from "@/hooks/use-active-event";
import { TrackTicketModal } from "@/components/public/track-ticket-modal";

const navItems = [
  { label: "Beranda", href: "/" },
  { label: "Tentang", href: "/tentang" },
  { label: "HIPMI", href: "/hipmi" },
  { label: "Tiket", href: "/tiket" },
];

const infoItems = [
  { label: "FAQ", href: "/faq" },
  { label: "Kontak", href: "/hubungi" },
];

export function Navbar() {
  const pathname = usePathname();
  const { event } = useActiveEvent();

  const rawName = event?.name || "OPEN MIND";
  // Extract year from name if present (e.g., "OPEN MIND 2026" -> name: "OPEN MIND", year: "2026")
  const yearMatch = rawName.match(/\s+(\d{4})$/);
  const eventName = yearMatch ? rawName.replace(/\s+\d{4}$/, "") : rawName;
  const eventYear = yearMatch ? yearMatch[1] : (event?.year || "2026");

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isHeroTransparent = pathname === "/" && !scrolled;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isHeroTransparent
            ? "bg-transparent"
            : "glass border-b border-border/80 shadow-sm"
          }`}
      >
        <nav className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-2 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group min-w-0 flex-shrink-0">
              <img
                src="/logo-om.jpg"
                alt="OPEN MIND Logo"
                className="h-8 w-8 rounded-lg object-cover sm:h-9 sm:w-9 lg:h-10 lg:w-10"
              />
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span
                  className={`font-display text-lg font-bold tracking-wider transition-colors duration-300 sm:text-xl lg:text-2xl truncate ${isHeroTransparent ? "text-ivory-100" : "text-navy-900"
                    }`}
                >
                  {eventName}
                </span>
                <span
                  className={`shrink-0 text-[10px] font-bold tracking-widest uppercase transition-colors duration-300 ${isHeroTransparent ? "text-gold-400" : "text-gold-600"
                    }`}
                >
                  {eventYear}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden xl:flex items-center gap-1">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative px-3.5 py-2 text-sm font-semibold transition-colors duration-200"
                  >
                    <span
                      className={`relative z-10 transition-colors duration-200 ${active
                          ? isHeroTransparent
                            ? "text-gold-400 font-bold"
                            : "text-gold-600 font-bold"
                          : isHeroTransparent
                            ? "text-ivory-200/80 hover:text-white"
                            : "text-navy-900/75 hover:text-navy-900"
                        }`}
                    >
                      {item.label}
                    </span>

                    {/* Sliding Indicator */}
                    {active && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-gold-500"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                  </Link>
                );
              })}

              {/* Info Dropdown (FAQ & Kontak) */}
              <div
                className="relative"
                onMouseEnter={() => setInfoOpen(true)}
                onMouseLeave={() => setInfoOpen(false)}
              >
                <button
                  type="button"
                  className={`relative px-3.5 py-2 text-sm font-semibold transition-colors duration-200 ${
                    infoItems.some((i) => isActive(i.href))
                      ? isHeroTransparent
                        ? "text-gold-400 font-bold"
                        : "text-gold-600 font-bold"
                      : isHeroTransparent
                        ? "text-ivory-200/80 hover:text-white"
                        : "text-navy-900/75 hover:text-navy-900"
                  }`}
                >
                  Info
                  {/* Sliding Indicator */}
                  {infoItems.some((i) => isActive(i.href)) && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-gold-500"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>

                {/* Dropdown */}
                {infoOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full z-50 mt-0.5 min-w-[140px] rounded-xl border border-border bg-white py-1.5 shadow-xl"
                  >
                    {infoItems.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`block px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                            active
                              ? "bg-gold-500/10 text-gold-600 font-bold"
                              : "text-navy-900/70 hover:bg-navy-900/5 hover:text-navy-900"
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Right Side: Track Ticket Button + Admin Login + CTA Button + Mobile Trigger */}
            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
              {/* Cek Tiket Button */}
              <button
                type="button"
                onClick={() => setTrackModalOpen(true)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-300 hover:scale-105 ${
                  isHeroTransparent
                    ? "border-gold-400/40 bg-navy-900/70 text-gold-300 hover:border-gold-400 hover:bg-navy-900/90"
                    : "border-gold-500/40 bg-gold-500/10 text-[#856218] hover:border-gold-500/70 hover:bg-gold-500/20 shadow-xs"
                }`}
                title="Cek Status & E-Ticket"
              >
                <Search className={`h-3.5 w-3.5 ${isHeroTransparent ? "text-gold-400" : "text-[#856218]"}`} />
                <span className="text-[11px] sm:text-xs font-bold">Cek Tiket</span>
              </button>

              {/* Admin Login */}
              <Link
                href="/admin/login"
                className={`hidden md:inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all duration-300 hover:scale-105 ${
                  isHeroTransparent
                    ? "border-gold-400/40 text-gold-400 hover:bg-gold-400/10"
                    : "border-navy-900/20 text-navy-900/70 hover:bg-navy-900/5 hover:text-navy-900"
                }`}
              >
                <LogIn className="h-3 w-3" />
                <span>Login</span>
              </Link>

              {/* CTA Button */}
              <Link
                href="/tiket"
                aria-label="Beli Tiket"
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-gold-500 px-2.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-navy-950 transition-all duration-300 hover:bg-gold-400 shadow-md shadow-gold-500/20 hover:scale-105"
              >
                <Ticket className="h-4 w-4 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Beli Tiket</span>
              </Link>

              {/* Mobile Hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={`xl:hidden p-1.5 sm:p-2 rounded-lg transition-colors ${isHeroTransparent
                    ? "text-ivory-100 hover:bg-white/10"
                    : "text-navy-900 hover:bg-navy-900/5"
                  }`}
                aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
              >
                {mobileOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Track Ticket Popup Modal */}
      <TrackTicketModal
        isOpen={trackModalOpen}
        onClose={() => setTrackModalOpen(false)}
      />

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        navItems={[...navItems, ...infoItems]}
        pathname={pathname}
        onOpenTrackModal={() => setTrackModalOpen(true)}
      />
    </>
  );
}
