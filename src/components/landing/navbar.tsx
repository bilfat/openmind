"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Ticket, Search, LogIn } from "lucide-react";
import { MobileMenu } from "./mobile-menu";
import { useActiveEvent } from "@/hooks/use-active-event";

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
  const router = useRouter();
  const { event } = useActiveEvent();

  const rawName = event?.name || "OPEN MIND";
  // Extract year from name if present (e.g., "OPEN MIND 2026" -> name: "OPEN MIND", year: "2026")
  const yearMatch = rawName.match(/\s+(\d{4})$/);
  const eventName = yearMatch ? rawName.replace(/\s+\d{4}$/, "") : rawName;
  const eventYear = yearMatch ? yearMatch[1] : (event?.year || "2026");

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
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

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/tiket?tab=check&order=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery("");
    setSearchOpen(false);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isHeroTransparent
            ? "bg-transparent"
            : "glass border-b border-border/80 shadow-sm"
          }`}
      >
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
              <img
                src="/logo-om.jpg"
                alt="OPEN MIND Logo"
                className="h-9 w-9 rounded-lg object-cover lg:h-10 lg:w-10"
              />
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`font-display text-xl font-bold tracking-wider transition-colors duration-300 lg:text-2xl ${isHeroTransparent ? "text-ivory-100" : "text-navy-900"
                    }`}
                >
                  {eventName}
                </span>
                <span
                  className={`text-[10px] font-bold tracking-widest uppercase transition-colors duration-300 ${isHeroTransparent ? "text-gold-400" : "text-gold-600"
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

            {/* Right Side: Quick Search Bar + Admin Login + CTA Button + Mobile Trigger */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Quick Search Form (Desktop) */}
              <form
                onSubmit={handleQuickSearch}
                className="hidden md:flex items-center relative"
              >
                <div className="relative flex items-center">
                  <Search
                    className={`absolute left-3 h-3.5 w-3.5 pointer-events-none transition-colors ${isHeroTransparent ? "text-gold-400" : "text-muted-foreground"
                      }`}
                  />
                  <input
                    type="text"
                    placeholder="Cek Tiket"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`h-9 w-40 lg:w-48 rounded-full border pl-8 pr-8 text-xs font-medium transition-all duration-300 focus:w-56 focus:outline-none focus:ring-2 ${isHeroTransparent
                        ? "border-gold-500/30 bg-navy-900/80 text-ivory-100 placeholder:text-ivory-200/50 focus:border-gold-500 focus:ring-gold-500/20"
                        : "border-border bg-white text-navy-900 placeholder:text-muted-foreground focus:border-gold-500 focus:ring-gold-500/20 shadow-sm"
                      }`}
                  />
                  {searchQuery && (
                    <button
                      type="submit"
                      className="absolute right-2 text-[10px] font-bold text-gold-500 hover:text-gold-400 uppercase"
                    >
                      Go
                    </button>
                  )}
                </div>
              </form>

              {/* Quick Search Toggle (Mobile/Tablet Icon button) */}
              <button
                type="button"
                onClick={() => setSearchOpen(!searchOpen)}
                className={`md:hidden p-2 rounded-full transition-colors ${isHeroTransparent
                    ? "text-ivory-100 hover:bg-white/10"
                    : "text-navy-900 hover:bg-navy-900/5"
                  }`}
                aria-label="Cari tiket"
              >
                <Search className="h-5 w-5" />
              </button>

              {/* Admin Login */}
              <Link
                href="/admin/login"
                className={`hidden sm:inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all duration-300 hover:scale-105 ${
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
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-gold-500 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-navy-950 transition-all duration-300 hover:bg-gold-400 shadow-md shadow-gold-500/20 hover:scale-105"
              >
                <Ticket className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Beli Tiket</span>
              </Link>

              {/* Mobile Hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={`xl:hidden p-2 rounded-lg transition-colors ${isHeroTransparent
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

          {/* Mobile Search Bar Dropdown */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden pb-3 overflow-hidden"
              >
                <form onSubmit={handleQuickSearch} className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Masukkan Order ID kamu (misal: OM26-00124)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-gold-500/40 bg-white py-2.5 pl-10 pr-20 text-xs text-navy-900 shadow-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-gold-500 px-3 py-1 text-xs font-bold text-navy-950"
                  >
                    Lacak
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        navItems={[...navItems, ...infoItems]}
        pathname={pathname}
      />
    </>
  );
}
