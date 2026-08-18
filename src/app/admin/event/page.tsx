"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  Clock,
  MapPin,
  Save,
  Globe,
  Lightbulb,
  Users,
  AlertCircle,
  Link2,
  Image as ImageIcon,
  X,
  MessageCircle,
  Check,
  Loader2,
  Eye,
  Upload,
  Trash2,
  Plus,
  Pencil,
  QrCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveEvent } from "@/hooks/use-active-event";
import type {
  EventConfig,
  EventSpeaker,
  EventAgendaItem,
  EventSpeakerInput,
  EventAgendaInput,
} from "@/lib/event-types";

// ── Defaults ────────────────────────────────────────────────
const emptySpeaker: EventSpeakerInput = {
  name: "",
  role: "speaker",
  role_label: "",
  position: "",
  business: "",
  bio: "",
  photo_url: "",
  instagram: "",
  linkedin: "",
  display_order: 0,
  is_visible: true,
};

const emptyAgenda: EventAgendaInput = {
  title: "",
  description: "",
  speaker_id: "",
  start_time: "",
  end_time: "",
  location: "",
  session_order: 0,
  is_visible: true,
};

// ── Page Component ────────────────────────────────────────────
export default function AdminEventPage() {
  const { event, speakers, agenda, loading, error, refetch } = useActiveEvent();
  const [settings, setSettings] = useState<Partial<EventConfig>>({});
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [qrisPreview, setQrisPreview] = useState<string | null>(null);

  // Speakers
  const [speakerFormOpen, setSpeakerFormOpen] = useState(false);
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [speakerForm, setSpeakerForm] = useState<EventSpeakerInput>(emptySpeaker);
  const [speakerSaving, setSpeakerSaving] = useState(false);
  const [speakerPhotoFile, setSpeakerPhotoFile] = useState<File | null>(null);
  const [speakerPhotoUploading, setSpeakerPhotoUploading] = useState(false);

  // Agenda
  const [agendaFormOpen, setAgendaFormOpen] = useState(false);
  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);
  const [agendaForm, setAgendaForm] = useState<EventAgendaInput>(emptyAgenda);
  const [agendaSaving, setAgendaSaving] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<"event" | "speakers" | "agenda">("event");

  // Preview Guest Modal State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const handleOpenPreview = () => {
    const ts = Date.now();
    setPreviewUrl(`/?_preview=${ts}`);
    setPreviewOpen(true);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── Load Event Data ────────────────────────────────────────
  const loadSpeakersLocal = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/event/speakers");
      const json = await res.json();
      if (json.success) {
        // speakers are loaded via useActiveEvent, but we may need local state for forms
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (event) {
      setSettings(event);
      setPosterPreview(event.poster_url || null);
      setQrisPreview(event.qris_image_url || null);
    }
  }, [event]);

  // ── Save Event Config ──────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const fd = new FormData();
      for (const [key, value] of Object.entries(settings)) {
        if (value !== undefined && value !== null) {
          fd.append(key, String(value));
        }
      }
      if (posterFile) {
        fd.append("poster", posterFile);
      }
      if (qrisFile) {
        fd.append("qris_image", qrisFile);
      }
      const res = await fetch("/api/admin/event", { method: "PATCH", body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan pengaturan event.");
      }
      setSettings(json.data as Partial<EventConfig>);
      setPosterPreview(json.data?.poster_url || null);
      setPosterFile(null);
      setQrisFile(null);
      setQrisPreview(json.data?.qris_image_url || null);
      await refetch();
      showToast("Pengaturan event berhasil disimpan.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof EventConfig, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // ── Speaker CRUD ───────────────────────────────────────────
  const openNewSpeaker = () => {
    setEditingSpeakerId(null);
    setSpeakerForm({ ...emptySpeaker, display_order: speakers.length });
    setSpeakerPhotoFile(null);
    setSpeakerFormOpen(true);
  };

  const openEditSpeaker = (sp: EventSpeaker) => {
    setEditingSpeakerId(sp.id);
    setSpeakerForm({
      name: sp.name,
      role: sp.role,
      role_label: sp.role_label ?? "",
      position: sp.position ?? "",
      business: sp.business ?? "",
      bio: sp.bio ?? "",
      photo_url: sp.photo_url ?? "",
      instagram: sp.instagram ?? "",
      linkedin: sp.linkedin ?? "",
      display_order: sp.display_order,
      is_visible: sp.is_visible,
    });
    setSpeakerPhotoFile(null);
    setSpeakerFormOpen(true);
  };

  const uploadSpeakerPhoto = async (file: File): Promise<string | null> => {
    setSpeakerPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/event/speakers/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengunggah foto.");
      }
      return json.url as string;
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal mengunggah foto.");
      return null;
    } finally {
      setSpeakerPhotoUploading(false);
    }
  };

  const saveSpeaker = async () => {
    setSpeakerSaving(true);
    setErrorMsg(null);
    try {
      let photoUrl = speakerForm.photo_url || "";
      if (speakerPhotoFile) {
        const uploadedUrl = await uploadSpeakerPhoto(speakerPhotoFile);
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
        } else {
          setSpeakerSaving(false);
          return;
        }
      }

      const bodyToSend = { ...speakerForm, photo_url: photoUrl };
      const method = editingSpeakerId ? "PATCH" : "POST";
      const url = editingSpeakerId
        ? `/api/admin/event/speakers/${editingSpeakerId}`
        : "/api/admin/event/speakers";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyToSend),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan pembicara.");
      }
      setSpeakerFormOpen(false);
      setSpeakerPhotoFile(null);
      await refetch();
      showToast(editingSpeakerId ? "Pembicara berhasil diperbarui." : "Pembicara berhasil ditambahkan.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menyimpan pembicara.");
    } finally {
      setSpeakerSaving(false);
    }
  };

  const deleteSpeaker = async (id: string) => {
    if (!confirm("Hapus pembicara ini?")) return;
    try {
      const res = await fetch(`/api/admin/event/speakers/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Gagal menghapus.");
      await refetch();
      showToast("Pembicara berhasil dihapus.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menghapus pembicara.");
    }
  };

  const toggleSpeakerVisibility = async (sp: EventSpeaker) => {
    try {
      const res = await fetch(`/api/admin/event/speakers/${sp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_visible: !sp.is_visible }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Gagal mengubah visibilitas.");
      await refetch();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal mengubah visibilitas.");
    }
  };

  // ── Agenda CRUD ────────────────────────────────────────────
  const openNewAgenda = () => {
    setEditingAgendaId(null);
    setAgendaForm({ ...emptyAgenda, session_order: agenda.length });
    setAgendaFormOpen(true);
  };

  const openEditAgenda = (ag: EventAgendaItem) => {
    setEditingAgendaId(ag.id);
    setAgendaForm({
      title: ag.title,
      description: ag.description ?? "",
      speaker_id: ag.speaker_id ?? "",
      start_time: ag.start_time ?? "",
      end_time: ag.end_time ?? "",
      location: ag.location ?? "",
      session_order: ag.session_order,
      is_visible: ag.is_visible,
    });
    setAgendaFormOpen(true);
  };

  const saveAgenda = async () => {
    setAgendaSaving(true);
    setErrorMsg(null);
    try {
      const method = editingAgendaId ? "PATCH" : "POST";
      const url = editingAgendaId
        ? `/api/admin/event/agenda/${editingAgendaId}`
        : "/api/admin/event/agenda";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agendaForm),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan agenda.");
      }
      setAgendaFormOpen(false);
      await refetch();
      showToast(editingAgendaId ? "Agenda berhasil diperbarui." : "Agenda berhasil ditambahkan.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menyimpan agenda.");
    } finally {
      setAgendaSaving(false);
    }
  };

  const deleteAgenda = async (id: string) => {
    if (!confirm("Hapus agenda ini?")) return;
    try {
      const res = await fetch(`/api/admin/event/agenda/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Gagal menghapus.");
      await refetch();
      showToast("Agenda berhasil dihapus.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menghapus agenda.");
    }
  };

  // ── Render ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-navy-950 px-5 py-3 text-xs font-bold text-ivory-100 shadow-2xl border border-gold-500/30 flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error Banner */}
      {(errorMsg || error) && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-3 text-xs font-semibold text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{errorMsg || error}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
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
            Kelola informasi utama, branding, pembicara, agenda, dan kontak helpdesk.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleOpenPreview}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-3 text-xs font-bold text-navy-900 hover:bg-secondary transition-all shadow-sm"
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Preview Guest</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95",
              "bg-gold-500 text-navy-950 hover:bg-gold-400"
            )}
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Menyimpan..." : "Simpan Perubahan"}</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="rounded-3xl border border-border bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-1">
          {[
            { id: "event" as const, label: "Informasi Event", icon: CalendarDays },
            { id: "speakers" as const, label: "Pembicara", icon: Users },
            { id: "agenda" as const, label: "Agenda", icon: Clock },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all",
                activeTab === tab.id
                  ? "bg-navy-900 text-gold-400 shadow-sm"
                  : "text-navy-900/60 hover:bg-secondary hover:text-navy-900"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.id === "speakers" && speakers.length > 0 && (
                <span className="ml-1 rounded-full bg-gold-500/20 px-1.5 py-0.5 text-[10px] font-bold text-gold-600">
                  {speakers.length}
                </span>
              )}
              {tab.id === "agenda" && agenda.length > 0 && (
                <span className="ml-1 rounded-full bg-gold-500/20 px-1.5 py-0.5 text-[10px] font-bold text-gold-600">
                  {agenda.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB: EVENT INFO                                        */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === "event" && (
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <CalendarDays className="h-5 w-5 text-gold-600" />
            <h2 className="font-display text-lg font-bold text-navy-900">
              Informasi Event
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <AdminField label="Nama Event" value={settings.name || ""} onChange={(v) => handleChange("name", v)} placeholder="OPEN MIND" />
            <AdminField label="Tahun" value={settings.year || ""} onChange={(v) => handleChange("year", v)} placeholder="2026" />
            <AdminField label="Tema Event" value={settings.theme || ""} onChange={(v) => handleChange("theme", v)} placeholder="One Action Endless Impact" />
            <AdminField label="Tagline" value={settings.tagline || ""} onChange={(v) => handleChange("tagline", v)} placeholder="Expand Your Perspective..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2 border-t border-border">
            <AdminField label="Tanggal Pelaksanaan" value={settings.event_date || ""} onChange={(v) => handleChange("event_date", v)} type="date" />
            <AdminField label="Waktu Mulai" value={settings.start_time || ""} onChange={(v) => handleChange("start_time", v)} placeholder="09:00" />
            <AdminField label="Waktu Selesai" value={settings.end_time || ""} onChange={(v) => handleChange("end_time", v)} placeholder="17:00" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <AdminField label="Venue / Lokasi" value={settings.venue || ""} onChange={(v) => handleChange("venue", v)} placeholder="Telkom University" icon={<MapPin className="h-3.5 w-3.5" />} />
            <AdminField label="Alamat Lengkap" value={settings.address || ""} onChange={(v) => handleChange("address", v)} placeholder="Jl. Telekomunikasi, Bandung" />
          </div>

          {/* Poster Upload */}
          <div className="pt-2 border-t border-border">
            <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
              Poster Event
            </label>
            <div className="flex items-start gap-4">
              <div className="relative w-32 h-44 rounded-xl border-2 border-dashed border-border bg-secondary/20 overflow-hidden flex items-center justify-center">
                {posterPreview ? (
                  <>
                    <img src={posterPreview} alt="Poster" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setPosterFile(null);
                        setPosterPreview(null);
                        if (settings.poster_url) {
                          handleChange("poster_url", "");
                        }
                      }}
                      className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600 transition-colors shadow-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <ImageIcon className="h-8 w-8 text-navy-900/20" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  id="poster-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPosterFile(file);
                      setPosterPreview(URL.createObjectURL(file));
                    }
                  }}
                />
                <label
                  htmlFor="poster-upload"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-xs font-bold text-navy-900 hover:bg-secondary/60 cursor-pointer transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span>{posterPreview ? "Ganti Poster" : "Unggah Poster"}</span>
                </label>
                <p className="text-[10px] text-muted-foreground">
                  Format: JPEG, PNG, atau WEBP. Maksimal 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* QRIS Image Upload */}
          <div className="pt-2 border-t border-border">
            <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
              QRIS Pembayaran
            </label>
            <div className="flex items-start gap-4">
              <div className="relative w-36 h-36 rounded-xl border-2 border-dashed border-border bg-secondary/20 overflow-hidden flex items-center justify-center">
                {qrisPreview ? (
                  <>
                    <img src={qrisPreview} alt="QRIS" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => {
                        setQrisFile(null);
                        setQrisPreview(null);
                        if (settings.qris_image_url) {
                          handleChange("qris_image_url", "");
                        }
                      }}
                      className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600 transition-colors shadow-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <QrCode className="h-10 w-10 text-navy-900/20" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  id="qris-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setQrisFile(file);
                      setQrisPreview(URL.createObjectURL(file));
                    }
                  }}
                />
                <label
                  htmlFor="qris-upload"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-xs font-bold text-navy-900 hover:bg-secondary/60 cursor-pointer transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span>{qrisPreview ? "Ganti QRIS" : "Unggah QRIS"}</span>
                </label>
                <p className="text-[10px] text-muted-foreground">
                  Format: JPEG, PNG, atau WEBP. Maksimal 5MB. Gambar QRIS ini akan ditampilkan pada halaman pembayaran tiket.
                </p>
                {qrisPreview && (
                  <div className="rounded-xl border border-gold-500/20 bg-gold-500/5 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">
                      LIVE PREVIEW — QRIS
                    </span>
                    <img src={qrisPreview} alt="QRIS Preview" className="mt-2 w-24 h-24 object-contain rounded-lg border border-border" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Social & Contact Fields */}
          <div className="pt-4 border-t border-border space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-navy-900 flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-gold-600" />
              Media Sosial & Kontak
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AdminField label="Instagram" value={settings.instagram_url || ""} onChange={(v) => handleChange("instagram_url", v)} placeholder="https://instagram.com/..." icon={<Link2 className="h-3.5 w-3.5" />} />
              <AdminField label="TikTok" value={settings.tiktok_url || ""} onChange={(v) => handleChange("tiktok_url", v)} placeholder="https://tiktok.com/..." icon={<Link2 className="h-3.5 w-3.5" />} />
              <AdminField label="Instagram HIPMI" value={settings.hipmi_instagram_url || ""} onChange={(v) => handleChange("hipmi_instagram_url", v)} placeholder="https://instagram.com/..." icon={<Link2 className="h-3.5 w-3.5" />} />
              <AdminField label="TikTok HIPMI" value={settings.hipmi_tiktok_url || ""} onChange={(v) => handleChange("hipmi_tiktok_url", v)} placeholder="https://tiktok.com/..." icon={<Link2 className="h-3.5 w-3.5" />} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AdminField label="WhatsApp (Format Internasional)" value={settings.contact_whatsapp || ""} onChange={(v) => handleChange("contact_whatsapp", v)} placeholder="6281234567890" icon={<MessageCircle className="h-3.5 w-3.5" />} />
              <AdminField label="WhatsApp (Display Text)" value={settings.contact_whatsapp_display || ""} onChange={(v) => handleChange("contact_whatsapp_display", v)} placeholder="+62 812-3456-7890" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AdminField label="WhatsApp Group Link" value={settings.whatsapp_group_url || ""} onChange={(v) => handleChange("whatsapp_group_url", v)} placeholder="https://chat.whatsapp.com/..." icon={<MessageCircle className="h-3.5 w-3.5" />} />
            </div>
            <p className="text-[10px] text-muted-foreground -mt-2">
              Link grup WhatsApp ini akan otomatis muncul di email tiket, e-ticket, PDF tiket, dan halaman utama (footer) saat peserta sudah membeli tiket.
            </p>
          </div>

          {/* Description / About */}
          <div className="pt-4 border-t border-border">
            <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
              Deskripsi Event
            </label>
            <textarea
              rows={5}
              value={settings.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/20 p-4 text-xs text-navy-900 leading-relaxed focus:border-gold-500 focus:bg-white focus:outline-none resize-y"
              placeholder="Tuliskan deskripsi lengkap mengenai event..."
            />
            <span className="text-[10px] text-muted-foreground block mt-1">
              {(settings.description || "").length} / 4000 karakter
            </span>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB: SPEAKERS                                          */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === "speakers" && (
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gold-600" />
              <h2 className="font-display text-lg font-bold text-navy-900">
                Pembicara
              </h2>
            </div>
            <button
              type="button"
              onClick={openNewSpeaker}
              className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Pembicara</span>
            </button>
          </div>

          {speakers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-navy-900/10 mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">Belum ada pembicara ditambahkan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {speakers.map((sp) => (
                <div key={sp.id} className={cn(
                  "flex items-center gap-4 rounded-2xl border p-4 transition-all",
                  sp.is_visible ? "border-border bg-white" : "border-border bg-secondary/30 opacity-60"
                )}>
                  <img
                    src={sp.photo_url || "/placeholder-avatar.png"}
                    alt={sp.name}
                    className="w-14 h-14 rounded-xl object-cover border border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-navy-900 truncate">{sp.name}</p>
                    <p className="text-[10px] text-muted-foreground">{sp.role_label || sp.role}</p>
                    {sp.position && <p className="text-[10px] text-muted-foreground truncate">{sp.position}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleSpeakerVisibility(sp)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors",
                        sp.is_visible
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      )}
                    >
                      {sp.is_visible ? "Visible" : "Hidden"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditSpeaker(sp)}
                      className="rounded-lg p-2 text-navy-900/40 hover:text-gold-600 hover:bg-secondary transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSpeaker(sp.id)}
                      className="rounded-lg p-2 text-navy-900/40 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB: AGENDA                                            */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === "agenda" && (
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gold-600" />
              <h2 className="font-display text-lg font-bold text-navy-900">
                Agenda
              </h2>
            </div>
            <button
              type="button"
              onClick={openNewAgenda}
              className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Agenda</span>
            </button>
          </div>

          {agenda.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-navy-900/10 mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">Belum ada agenda ditambahkan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agenda.map((ag) => (
                <div key={ag.id} className={cn(
                  "flex items-center gap-4 rounded-2xl border p-4 transition-all",
                  ag.is_visible ? "border-border bg-white" : "border-border bg-secondary/30 opacity-60"
                )}>
                  <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-gold-600">#{ag.session_order + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-navy-900 truncate">{ag.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {ag.start_time && <span>{ag.start_time}</span>}
                      {ag.end_time && <span>- {ag.end_time}</span>}
                      {ag.location && <span>• {ag.location}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditAgenda(ag)}
                      className="rounded-lg p-2 text-navy-900/40 hover:text-gold-600 hover:bg-secondary transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAgenda(ag.id)}
                      className="rounded-lg p-2 text-navy-900/40 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL: Speaker Form                                    */}
      {/* ════════════════════════════════════════════════════════ */}
      {speakerFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm" onClick={() => setSpeakerFormOpen(false)} />
          <div className="relative bg-white rounded-3xl border border-border shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <span className="text-sm font-bold text-navy-900">
                {editingSpeakerId ? "Edit Pembicara" : "Tambah Pembicara"}
              </span>
              <button
                type="button"
                onClick={() => setSpeakerFormOpen(false)}
                className="p-2 rounded-lg text-navy-900/40 hover:text-navy-900 hover:bg-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Photo Upload */}
              <div className="flex items-center gap-4">
                <img
                  src={speakerForm.photo_url || "/placeholder-avatar.png"}
                  alt="Photo"
                  className="w-16 h-16 rounded-xl object-cover border border-border"
                />
                <div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    id="speaker-photo-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSpeakerPhotoFile(file);
                        setSpeakerForm((p) => ({ ...p, photo_url: URL.createObjectURL(file) }));
                      }
                    }}
                  />
                  <label
                    htmlFor="speaker-photo-upload"
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-[10px] font-bold text-navy-900 hover:bg-secondary/60 cursor-pointer transition-colors"
                  >
                    <Upload className="h-3 w-3" />
                    <span>{speakerPhotoUploading ? "Mengunggah..." : "Unggah Foto"}</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AdminField label="Nama" value={speakerForm.name} onChange={(v) => setSpeakerForm((p) => ({ ...p, name: v }))} placeholder="John Doe" />
                <AdminField label="Role" value={speakerForm.role} onChange={(v) => setSpeakerForm((p) => ({ ...p, role: v }))} placeholder="speaker" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AdminField label="Role Label" value={speakerForm.role_label || ""} onChange={(v) => setSpeakerForm((p) => ({ ...p, role_label: v }))} placeholder="CEO & Founder" />
                <AdminField label="Posisi" value={speakerForm.position || ""} onChange={(v) => setSpeakerForm((p) => ({ ...p, position: v }))} placeholder="CEO" />
              </div>
              <AdminField label="Bisnis" value={speakerForm.business || ""} onChange={(v) => setSpeakerForm((p) => ({ ...p, business: v }))} placeholder="PT Maju Jaya" />
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">Bio</label>
                <textarea
                  rows={3}
                  value={speakerForm.bio || ""}
                  onChange={(e) => setSpeakerForm((p) => ({ ...p, bio: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-secondary/20 p-4 text-xs text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none resize-y"
                  placeholder="Biografi singkat pembicara..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AdminField label="Instagram" value={speakerForm.instagram || ""} onChange={(v) => setSpeakerForm((p) => ({ ...p, instagram: v }))} placeholder="@username" />
                <AdminField label="LinkedIn" value={speakerForm.linkedin || ""} onChange={(v) => setSpeakerForm((p) => ({ ...p, linkedin: v }))} placeholder="https://linkedin.com/..." />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white rounded-b-3xl border-t border-border px-6 py-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSpeakerFormOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-navy-900/60 hover:text-navy-900 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveSpeaker}
                disabled={speakerSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-all disabled:opacity-50"
              >
                {speakerSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{speakerSaving ? "Menyimpan..." : "Simpan"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL: Agenda Form                                     */}
      {/* ════════════════════════════════════════════════════════ */}
      {agendaFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm" onClick={() => setAgendaFormOpen(false)} />
          <div className="relative bg-white rounded-3xl border border-border shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <span className="text-sm font-bold text-navy-900">
                {editingAgendaId ? "Edit Agenda" : "Tambah Agenda"}
              </span>
              <button
                type="button"
                onClick={() => setAgendaFormOpen(false)}
                className="p-2 rounded-lg text-navy-900/40 hover:text-navy-900 hover:bg-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <AdminField label="Judul Sesi" value={agendaForm.title} onChange={(v) => setAgendaForm((p) => ({ ...p, title: v }))} placeholder="Keynote: Masa Depan Digital" />
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">Deskripsi</label>
                <textarea
                  rows={3}
                  value={agendaForm.description || ""}
                  onChange={(e) => setAgendaForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-secondary/20 p-4 text-xs text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none resize-y"
                  placeholder="Deskripsi singkat sesi ini..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AdminField label="Waktu Mulai" value={agendaForm.start_time || ""} onChange={(v) => setAgendaForm((p) => ({ ...p, start_time: v }))} placeholder="09:00" />
                <AdminField label="Waktu Selesai" value={agendaForm.end_time || ""} onChange={(v) => setAgendaForm((p) => ({ ...p, end_time: v }))} placeholder="10:00" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AdminField label="Lokasi / Ruangan" value={agendaForm.location || ""} onChange={(v) => setAgendaForm((p) => ({ ...p, location: v }))} placeholder="Auditorium" icon={<MapPin className="h-3.5 w-3.5" />} />
                <AdminField label="Urutan Sesi" value={String(agendaForm.session_order ?? 0)} onChange={(v) => setAgendaForm((p) => ({ ...p, session_order: parseInt(v) || 0 }))} type="number" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white rounded-b-3xl border-t border-border px-6 py-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAgendaFormOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-navy-900/60 hover:text-navy-900 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveAgenda}
                disabled={agendaSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-all disabled:opacity-50"
              >
                {agendaSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{agendaSaving ? "Menyimpan..." : "Simpan"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL: Guest Preview (iframe)                         */}
      {/* ════════════════════════════════════════════════════════ */}
      {previewOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm" onClick={() => setPreviewOpen(false)} />
          <div className="relative bg-white rounded-3xl border border-border shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-3">
              <span className="text-xs font-bold text-navy-900">Preview Guest View</span>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="p-2 rounded-lg text-navy-900/40 hover:text-navy-900 hover:bg-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <iframe
              src={previewUrl}
              className="flex-1 w-full border-0"
              title="Guest Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable Admin Field Component ────────────────────────────
function AdminField({
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
