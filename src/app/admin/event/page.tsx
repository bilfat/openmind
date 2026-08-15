"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  Clock,
  MapPin,
  Sparkles,
  Save,
  MessageSquare,
  Music,
  Globe,
  Megaphone,
  Lightbulb,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Calendar,
  Link2,
  Trash2,
  Copy,
  Image as ImageIcon,
  Settings,
  Menu,
  X,
  MessageCircle,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Event Settings Store ──────────────────────────────────────
const STORAGE_KEY = "open_mind_event_settings_2026";

interface EventSettings {
  name: string;
  year: string;
  theme: string;
  tagline: string;
  date: string;
  dateISO: string;
  time: string;
  venue: string;
  organizer: string;
  about: string;
  heroTitle: string;
  heroSubtitle: string;
  socialOpenMindIG: string;
  socialOpenMindTikTok: string;
  socialHipmiIG: string;
  socialHipmiTikTok: string;
  contactWhatsApp: string;
  contactWhatsAppDisplay: string;
}

const defaultSettings: EventSettings = {
  name: "OPEN MIND",
  year: "2026",
  theme: "One Action Endless Impact",
  tagline: "Expand Your Perspective, Build Your Future.",
  date: "18 September 2026",
  dateISO: "2026-09-18",
  time: "09:00 - 17:00 WIB",
  venue: "Telkom University",
  organizer: "HIPMI PT Telkom University",
  about: "OPEN MIND adalah sebuah event seminar dan networking eksklusif yang diselenggarakan oleh HIPMI PT Telkom University. Event ini menghadirkan para pembicara inspiratif dari dunia bisnis dan entrepreneurship untuk berbagi insight, pengalaman, dan strategi membangun masa depan.",
  heroTitle: "OPEN MIND 2026",
  heroSubtitle: "One Action Endless Impact",
  socialOpenMindIG: "https://www.instagram.com/openmindhipmi_2026?igsh=MW5neXFsZ3R5bDFldA==",
  socialOpenMindTikTok: "https://www.tiktok.com/@openmindhipmi2026?_r=1&_t=ZS-98sbK53gQKL",
  socialHipmiIG: "https://www.instagram.com/hipmiunivtelkom?igsh=MWNqOGNobW81eHRqcw==",
  socialHipmiTikTok: "https://www.tiktok.com/@hipmiunivtelkom",
  contactWhatsApp: "6281234567890",
  contactWhatsAppDisplay: "+62 812-3456-7890",
};

function getStoredSettings(): EventSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
      return defaultSettings;
    }
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(data: EventSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Page Component ────────────────────────────────────────────
export default function AdminEventPage() {
  const [settings, setSettings] = useState<EventSettings>(() => getStoredSettings());
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("event");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleChange = (field: keyof EventSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      saveSettings(settings);
      setIsSaving(false);
      setIsDirty(false);
      showToast("Pengaturan event berhasil disimpan.");
    }, 600);
  };

  const sections = [
    { id: "event", label: "Informasi Event", icon: CalendarDays },
    { id: "hero", label: "Hero & Branding", icon: ImageIcon },
    { id: "about", label: "Tentang Event", icon: Lightbulb },
    { id: "social", label: "Media Sosial", icon: Globe },
    { id: "contact", label: "Kontak & Helpdesk", icon: MessageCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-navy-950 px-5 py-3 text-xs font-bold text-ivory-100 shadow-2xl border border-gold-500/30 flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-600 mb-2 border border-gold-500/20">
            <CalendarDays className="h-3 w-3" />
            <span>SUPER ADMIN / EVENT SETTINGS</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">
            Pengaturan Event
          </h1>
          <p className="text-xs sm:text-sm text-navy-900/70 mt-1">
            Kelola informasi utama, branding, media sosial, dan kontak helpdesk OPEN MIND 2026.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className={cn(
            "inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 self-start sm:self-auto",
            isDirty
              ? "bg-gold-500 text-navy-950 hover:bg-gold-400"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? "Menyimpan..." : "Simpan Perubahan"}</span>
        </button>
      </div>

      {/* Section Tabs */}
      <div className="rounded-3xl border border-border bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-1">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all",
                activeSection === s.id
                  ? "bg-navy-900 text-gold-400 shadow-sm"
                  : "text-navy-900/60 hover:bg-secondary hover:text-navy-900"
              )}
            >
              <s.icon className="h-3.5 w-3.5" />
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Section Content */}
      <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-6">
        {/* ── SECTION: Event Info ─────────────────────────── */}
        {activeSection === "event" && (
          <>
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <CalendarDays className="h-5 w-5 text-gold-600" />
              <h2 className="font-display text-lg font-bold text-navy-900">
                Informasi Event
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <SettingsField label="Nama Event" value={settings.name} onChange={(v) => handleChange("name", v)} placeholder="OPEN MIND" />
              <SettingsField label="Tahun" value={settings.year} onChange={(v) => handleChange("year", v)} placeholder="2026" />
              <SettingsField label="Tema Event" value={settings.theme} onChange={(v) => handleChange("theme", v)} placeholder="One Action Endless Impact" />
              <SettingsField label="Tagline" value={settings.tagline} onChange={(v) => handleChange("tagline", v)} placeholder="Expand Your Perspective..." />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2 border-t border-border">
              <SettingsField label="Tanggal Pelaksanaan" value={settings.dateISO} onChange={(v) => handleChange("dateISO", v)} type="date" />
              <SettingsField label="Waktu Pelaksanaan" value={settings.time} onChange={(v) => handleChange("time", v)} placeholder="09:00 - 17:00 WIB" />
              <SettingsField label="Venue / Lokasi" value={settings.venue} onChange={(v) => handleChange("venue", v)} placeholder="Telkom University" icon={<MapPin className="h-3.5 w-3.5" />} />
            </div>

            <SettingsField label="Penyelenggara" value={settings.organizer} onChange={(v) => handleChange("organizer", v)} placeholder="HIPMI PT Telkom University" />
          </>
        )}

        {/* ── SECTION: Hero & Branding ───────────────────── */}
        {activeSection === "hero" && (
          <>
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <ImageIcon className="h-5 w-5 text-gold-600" />
              <h2 className="font-display text-lg font-bold text-navy-900">
                Hero Section & Branding
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <SettingsField label="Judul Hero" value={settings.heroTitle} onChange={(v) => handleChange("heroTitle", v)} placeholder="OPEN MIND 2026" />
              <SettingsField label="Subjudul Hero" value={settings.heroSubtitle} onChange={(v) => handleChange("heroSubtitle", v)} placeholder="One Action Endless Impact" />
            </div>

            {/* Hero Preview */}
            <div className="rounded-2xl border border-gold-500/20 bg-navy-950 p-6 text-center space-y-3 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-gold-500/10 via-transparent to-navy-900/50 pointer-events-none" />
              <div className="relative z-10 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold-400">
                  LIVE PREVIEW — HERO SECTION
                </span>
                <h3 className="font-display text-3xl font-black text-ivory-100 leading-tight">
                  {settings.heroTitle || "OPEN MIND 2026"}
                </h3>
                <p className="text-sm text-ivory-200/70 italic">
                  {settings.heroSubtitle || "One Action Endless Impact"}
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-gold-400 pt-2">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>{settings.date || settings.dateISO}</span>
                  <span className="text-ivory-200/30">•</span>
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{settings.venue}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── SECTION: About Event ───────────────────────── */}
        {activeSection === "about" && (
          <>
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <Lightbulb className="h-5 w-5 text-gold-600" />
              <h2 className="font-display text-lg font-bold text-navy-900">
                Tentang Event
              </h2>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                Deskripsi Event
              </label>
              <textarea
                rows={5}
                value={settings.about}
                onChange={(e) => handleChange("about", e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/20 p-4 text-xs text-navy-900 leading-relaxed focus:border-gold-500 focus:bg-white focus:outline-none resize-y"
                placeholder="Tuliskan deskripsi lengkap mengenai event OPEN MIND 2026..."
              />
              <span className="text-[10px] text-muted-foreground block mt-1">
                {settings.about.length} karakter
              </span>
            </div>
          </>
        )}

        {/* ── SECTION: Social Media ──────────────────────── */}
        {activeSection === "social" && (
          <>
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <Globe className="h-5 w-5 text-gold-600" />
              <h2 className="font-display text-lg font-bold text-navy-900">
                Media Sosial
              </h2>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-secondary/10 p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900 flex items-center gap-2">
                  <Megaphone className="h-3.5 w-3.5 text-gold-600" />
                  <span>OPEN MIND</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label="Instagram OPEN MIND (URL)" value={settings.socialOpenMindIG} onChange={(v) => handleChange("socialOpenMindIG", v)} placeholder="https://instagram.com/..." icon={<Link2 className="h-3.5 w-3.5" />} />
                  <SettingsField label="TikTok OPEN MIND (URL)" value={settings.socialOpenMindTikTok} onChange={(v) => handleChange("socialOpenMindTikTok", v)} placeholder="https://tiktok.com/..." icon={<Music className="h-3.5 w-3.5" />} />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/10 p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-gold-600" />
                  <span>HIPMI PT TELKOM UNIVERSITY</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label="Instagram HIPMI (URL)" value={settings.socialHipmiIG} onChange={(v) => handleChange("socialHipmiIG", v)} placeholder="https://instagram.com/..." icon={<Link2 className="h-3.5 w-3.5" />} />
                  <SettingsField label="TikTok HIPMI (URL)" value={settings.socialHipmiTikTok} onChange={(v) => handleChange("socialHipmiTikTok", v)} placeholder="https://tiktok.com/..." icon={<Music className="h-3.5 w-3.5" />} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── SECTION: Contact & Helpdesk ─────────────────── */}
        {activeSection === "contact" && (
          <>
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <MessageCircle className="h-5 w-5 text-gold-600" />
              <h2 className="font-display text-lg font-bold text-navy-900">
                Kontak Helpdesk & WhatsApp
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <SettingsField label="Nomor WhatsApp (Format Internasional)" value={settings.contactWhatsApp} onChange={(v) => handleChange("contactWhatsApp", v)} placeholder="6281234567890" icon={<MessageCircle className="h-3.5 w-3.5" />} />
              <SettingsField label="Nomor WhatsApp (Display Text)" value={settings.contactWhatsAppDisplay} onChange={(v) => handleChange("contactWhatsAppDisplay", v)} placeholder="+62 812-3456-7890" />
            </div>

            {/* Live WhatsApp Link Preview */}
            <div className="rounded-2xl border border-border bg-emerald-50 p-5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                LIVE PREVIEW — TOMBOL WHATSAPP
              </span>
              <a
                href={`https://wa.me/${settings.contactWhatsApp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Chat Helpdesk: {settings.contactWhatsAppDisplay || settings.contactWhatsApp}</span>
              </a>
            </div>
          </>
        )}
      </div>

      {/* Unsaved Changes Banner */}
      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-navy-950 border-t border-gold-500/30 px-6 py-3 flex items-center justify-between animate-in slide-in-from-bottom-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-gold-400" />
            <span className="text-xs font-semibold text-ivory-100">
              Anda memiliki perubahan yang belum disimpan.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSettings(getStoredSettings());
                setIsDirty(false);
              }}
              className="px-4 py-2 text-xs font-semibold text-ivory-200/70 hover:text-ivory-100"
            >
              Batalkan
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gold-500 px-5 py-2 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-all"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? "Menyimpan..." : "Simpan"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable Field Component ───────────────────────────────────
function SettingsField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-xl border border-border bg-secondary/20 py-3 text-xs font-medium text-navy-900 placeholder:text-muted-foreground focus:border-gold-500 focus:bg-white focus:outline-none transition-colors",
            icon ? "pl-10 pr-4" : "px-4"
          )}
        />
      </div>
    </div>
  );
}
