"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Save, User, Mail, Phone, BookOpen, GraduationCap, ShieldAlert } from "lucide-react";

export type ParticipantToEdit = {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string;
  nim: string;
  faculty: string;
  study_program: string;
};

interface EditParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  participant: ParticipantToEdit | null;
}

const FACULTY_OPTIONS = [
  { value: "Fakultas Ilmu Terapan", label: "FIT — Fakultas Ilmu Terapan" },
  { value: "Fakultas Industri Kreatif", label: "FIK — Fakultas Industri Kreatif" },
  { value: "Fakultas Informatika", label: "FIF — Fakultas Informatika" },
  { value: "Fakultas Teknik Elektro", label: "FTE — Fakultas Teknik Elektro" },
  { value: "Fakultas Rekayasa Industri", label: "FRI — Fakultas Rekayasa Industri" },
  { value: "Fakultas Ekonomi dan Bisnis", label: "FEB — Fakultas Ekonomi dan Bisnis" },
  { value: "Fakultas Komunikasi Sosial", label: "FKS — Fakultas Komunikasi Sosial" },
];

export function EditParticipantModal({
  isOpen,
  onClose,
  onSuccess,
  participant,
}: EditParticipantModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [nim, setNim] = useState("");
  const [faculty, setFaculty] = useState("");
  const [studyProgram, setStudyProgram] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (participant) {
      setFullName(participant.full_name || "");
      setEmail(participant.email || "");
      setWhatsapp(participant.whatsapp || "");
      setNim(participant.nim || "");
      setFaculty(participant.faculty || "Fakultas Ilmu Terapan");
      setStudyProgram(participant.study_program || "");
      setErrorMsg(null);
    }
  }, [participant]);

  if (!isOpen || !participant) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg("Nama lengkap tidak boleh kosong.");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg("Email tidak valid.");
      return;
    }
    if (!whatsapp.trim()) {
      setErrorMsg("Nomor WhatsApp tidak boleh kosong.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/participants/${participant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          whatsapp: whatsapp.trim(),
          nim: nim.trim(),
          faculty: faculty.trim(),
          study_program: studyProgram.trim(),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Gagal memperbarui data peserta.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Edit participant error:", err);
      setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  const isCustomFaculty = faculty && !FACULTY_OPTIONS.some((opt) => opt.value === faculty);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-navy-700/20 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-4 bg-navy-900 text-white">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gold-500/20 text-gold-400">
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-base font-bold text-ivory-100">Edit Master Data Peserta</h2>
              <p className="text-[10px] sm:text-xs text-ivory-200/60 font-mono">ID: {participant.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl text-ivory-200/50 hover:text-white hover:bg-navy-800 transition-colors"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Notice */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 sm:px-6 py-1.5 sm:py-2.5 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-semibold text-amber-800">
          <ShieldAlert className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 flex-shrink-0" />
          <span className="leading-tight sm:leading-normal">Pengubahan data ini akan berdampak ke semua tiket, check-in, dan e-ticket peserta.</span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 space-y-2.5 sm:space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-burgundy-50 border border-burgundy-200 text-[11px] sm:text-xs font-semibold text-burgundy-700">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2.5 sm:gap-4">
            {/* Nama Lengkap */}
            <div className="sm:col-span-2 space-y-1 sm:space-y-1.5">
              <label className="block text-[10px] sm:text-xs font-bold text-navy-900">
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-navy-900/40" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full rounded-xl border border-border bg-secondary/10 py-1.5 sm:py-2.5 pl-9 sm:pl-10 pr-3 sm:pr-4 text-[11px] sm:text-xs font-semibold text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="block text-[10px] sm:text-xs font-bold text-navy-900">
                Email / Gmail <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-navy-900/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="budi@gmail.com"
                  className="w-full rounded-xl border border-border bg-secondary/10 py-1.5 sm:py-2.5 pl-9 sm:pl-10 pr-3 sm:pr-4 text-[11px] sm:text-xs font-semibold text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* WhatsApp */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="block text-[10px] sm:text-xs font-bold text-navy-900">
                No. WhatsApp <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-navy-900/40" />
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="08123456789"
                  className="w-full rounded-xl border border-border bg-secondary/10 py-1.5 sm:py-2.5 pl-9 sm:pl-10 pr-3 sm:pr-4 text-[11px] sm:text-xs font-semibold text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* NIM */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="block text-[10px] sm:text-xs font-bold text-navy-900">NIM</label>
              <div className="relative">
                <BookOpen className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-navy-900/40" />
                <input
                  type="text"
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                  placeholder="670123456"
                  className="w-full rounded-xl border border-border bg-secondary/10 py-1.5 sm:py-2.5 pl-9 sm:pl-10 pr-3 sm:pr-4 text-[11px] sm:text-xs font-semibold text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Fakultas Dropdown */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="block text-[10px] sm:text-xs font-bold text-navy-900">Fakultas</label>
              <div className="relative">
                <GraduationCap className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-navy-900/40 pointer-events-none z-10" />
                <select
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/10 py-1.5 sm:py-2.5 pl-9 sm:pl-10 pr-3 sm:pr-4 text-[11px] sm:text-xs font-semibold text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none appearance-none"
                >
                  {isCustomFaculty && (
                    <option value={faculty}>{faculty}</option>
                  )}
                  {FACULTY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Program Studi */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="block text-[10px] sm:text-xs font-bold text-navy-900">Program Studi</label>
              <div className="relative">
                <GraduationCap className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-navy-900/40" />
                <input
                  type="text"
                  value={studyProgram}
                  onChange={(e) => setStudyProgram(e.target.value)}
                  placeholder="D3 Sistem Informasi"
                  className="w-full rounded-xl border border-border bg-secondary/10 py-1.5 sm:py-2.5 pl-9 sm:pl-10 pr-3 sm:pr-4 text-[11px] sm:text-xs font-semibold text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 sm:pt-4 flex items-center justify-end gap-2 sm:gap-2.5 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-border px-3.5 sm:px-4 py-1.5 sm:py-2.5 text-xs font-bold text-navy-900 hover:bg-secondary/40 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-navy-900 px-4 sm:px-5 py-1.5 sm:py-2.5 text-xs font-bold text-gold-400 hover:bg-navy-800 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

