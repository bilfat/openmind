"use client";

import Link from "next/link";
import { ExternalLink, MapPin, Mail, Phone, MessageSquare } from "lucide-react";
import { socialLinks, contactWhatsApp } from "@/data/social-links";
import { useActiveEvent } from "@/hooks/use-active-event";
import { waLink, eventDisplayName, formatEventDate, formatWhatsAppDisplay } from "@/lib/event-utils";

const footerNavItems = [
  { label: "Beranda", href: "/" },
  { label: "Tentang", href: "/tentang" },
  { label: "HIPMI", href: "/hipmi" },
  { label: "Tiket", href: "/tiket" },
  { label: "Hubungi", href: "/hubungi" },
];

export function Footer() {
  const { event } = useActiveEvent();

  const name = event?.name || "OPEN MIND";
  const year = event?.year || "2026";
  const displayName = eventDisplayName(event);
  const tagline = event?.tagline || event?.theme || "One Action Endless Impact";
  const venue = event?.venue || "Telkom University";
  const eventDate = formatEventDate(event?.event_date);
  const waNumber = event?.contact_whatsapp || contactWhatsApp.number;
  const waDisplay = event?.contact_whatsapp_display || formatWhatsAppDisplay(waNumber) || contactWhatsApp.display;
  const contactEmail = event?.contact_email || "openmind@hipmi.telu.ac.id";
  const waHref = waLink(waNumber) || `https://wa.me/${contactWhatsApp.number}`;
  const whatsappGroupUrl = "https://chat.whatsapp.com/CcstelOPT3o7PYItLVJf77?s=cl&p=i&mlu=0";

  const openMindLinks: { name: string; url: string }[] = [
    { name: "Instagram", url: event?.instagram_url || "" },
    { name: "TikTok", url: event?.tiktok_url || "" },
  ].filter((l) => l.url);

  const hipmiLinks: { name: string; url: string }[] = [
    { name: "Instagram", url: event?.hipmi_instagram_url || "" },
    { name: "TikTok", url: event?.hipmi_tiktok_url || "" },
  ].filter((l) => l.url);

  const displaySocials = openMindLinks.length > 0 ? openMindLinks : socialLinks.openMind;
  const displayHipmiSocials = hipmiLinks.length > 0 ? hipmiLinks : socialLinks.hipmi;

  return (
    <footer className="bg-navy-900 text-ivory-100">
      {/* Gold Top Border */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold-500 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-3">
              <img
                src="/logo-om.jpg"
                alt={displayName}
                className="h-12 w-12 rounded-lg object-cover"
              />
              <div>
                <h3 className="font-display text-2xl font-bold tracking-wider text-ivory-100">
                  {name}
                </h3>
                <span className="text-xs font-semibold tracking-[0.3em] text-gold-500">
                  {year}
                </span>
              </div>
            </Link>
            <div className="mt-4 flex items-center gap-3">
              <img
                src="/logo-hipmi.jpg"
                alt="HIPMI PT Telkom University"
                className="h-10 w-10 rounded-lg object-cover"
              />
              <span className="text-xs font-semibold text-ivory-200/60 leading-tight">
                HIPMI PT<br />Telkom University
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ivory-200/70">
              {tagline}. Sebuah event seminar dan networking eksklusif oleh HIPMI PT Telkom University.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-ivory-200/50">
              <MapPin className="h-4 w-4 text-gold-500" />
              <span>{eventDate ? `${eventDate} — ${venue}` : venue}</span>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-500 mb-4">
              Navigasi
            </h4>
            <ul className="space-y-2.5">
              {footerNavItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-ivory-200/60 hover:text-gold-400 transition-colors duration-200"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-500 mb-4">
              Follow Us
            </h4>
            <div className="space-y-6">
              {/* OPEN MIND */}
              <div>
                <p className="text-sm font-medium text-ivory-100 mb-2">{displayName}</p>
                <div className="space-y-2">
                  {displaySocials.map((link) => (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-ivory-200/60 hover:text-gold-400 transition-colors duration-200"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>{link.name}</span>
                    </a>
                  ))}
                </div>
              </div>
              {/* HIPMI */}
              <div>
                <p className="text-sm font-medium text-ivory-100 mb-2">HIPMI PT Telkom University</p>
                <div className="space-y-2">
                  {displayHipmiSocials.map((link) => (
                    <a
                      key={link.name + (link.url ?? "")}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-ivory-200/60 hover:text-gold-400 transition-colors duration-200"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>{link.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-500 mb-4">
              Kontak
            </h4>
            <div className="space-y-3">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-ivory-200/60 hover:text-gold-400 transition-colors duration-200"
              >
                <Phone className="h-4 w-4" />
                <span>{waDisplay}</span>
              </a>
              <a
                href={`mailto:${contactEmail}`}
                className="flex items-center gap-2 text-sm text-ivory-200/60 hover:text-gold-400 transition-colors duration-200"
              >
                <Mail className="h-4 w-4" />
                <span>{contactEmail}</span>
              </a>
              <a
                href={whatsappGroupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors duration-200"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Grup WhatsApp Event</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-navy-700/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-xs text-ivory-200/40">
            © {year} {displayName} × HIPMI PT Telkom University. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-xs text-ivory-200/40">
            <span className="gold-divider text-gold-500/60">✦</span>
            <span>{tagline}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
