"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket, ExternalLink, LogIn } from "lucide-react";

import { socialLinks } from "@/data/social-links";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: { label: string; href: string }[];
  pathname: string;
}

export function MobileMenu({ isOpen, onClose, navItems, pathname }: MobileMenuProps) {
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-navy-900/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />

          {/* Menu Panel */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-16 left-0 right-0 z-50 lg:hidden"
          >
            <div className="mx-4 mt-2 rounded-2xl border border-gold-500/20 bg-white shadow-xl overflow-hidden">
              {/* Nav Links */}
              <div className="p-4 space-y-1">
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                        isActive(item.href)
                          ? "bg-gold-500/10 text-gold-500 border-l-2 border-gold-500"
                          : "text-navy-900/70 hover:bg-navy-900/5 hover:text-navy-900"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <div className="border-t border-gold-500/10 p-4 space-y-2">
                <Link
                  href="/tiket"
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gold-500 px-6 py-3 text-sm font-semibold text-navy-900 transition-all hover:bg-gold-400"
                >
                  <Ticket className="h-4 w-4" />
                  Beli Tiket
                </Link>
                <Link
                  href="/admin/login"
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 rounded-xl border border-navy-900/20 px-6 py-3 text-sm font-semibold text-navy-900 transition-all hover:bg-navy-900/5"
                >
                  <LogIn className="h-4 w-4" />
                  Login Admin
                </Link>
              </div>

              {/* Social */}
              <div className="border-t border-gold-500/10 px-4 py-3 flex items-center justify-around">
                {[...socialLinks.openMind, ...socialLinks.hipmi].map((link) => (
                  <a
                    key={link.name + link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-navy-900/60 hover:text-gold-500 transition-colors"
                    aria-label={link.name}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>{link.name}</span>
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
