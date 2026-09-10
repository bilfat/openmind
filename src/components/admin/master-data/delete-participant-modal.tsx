"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertTriangle, ShieldAlert, Trash2, ArrowLeft, ArrowRight } from "lucide-react";

export type ParticipantToDelete = {
  id: string;
  full_name: string;
  email: string;
  nim?: string;
  orders?: Array<{ order?: { order_code: string } }>;
};

interface DeleteParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  participant: ParticipantToDelete | null;
}

export function DeleteParticipantModal({
  isOpen,
  onClose,
  onSuccess,
  participant,
}: DeleteParticipantModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setConfirmText("");
      setErrorMsg(null);
    }
  }, [isOpen, participant]);

  if (!isOpen || !participant) return null;

  const handleFinalDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (confirmText.trim().toUpperCase() !== "HAPUS") {
      setErrorMsg("Konfirmasi gagal. Anda harus mengetik kata 'HAPUS'.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/participants/${participant.id}`, {
        method: "DELETE",
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Gagal menghapus data peserta.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Delete participant error:", err);
      setErrorMsg(err.message || "Terjadi kesalahan saat menghapus data.");
    } finally {
      setLoading(false);
    }
  };

  const orderCodes = (participant.orders ?? [])
    .map((o) => o.order?.order_code)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-rose-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-rose-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Hapus Data Peserta</h2>
              <p className="text-xs text-rose-200/70 font-mono">Verifikasi Langkah {step} dari 2</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl text-rose-200/50 hover:text-white hover:bg-rose-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 bg-rose-100 w-full">
          <div
            className="h-full bg-rose-600 transition-all duration-300"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          {step === 1 ? (
            /* STEP 1 */
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
                <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h3 className="font-bold text-amber-900">Peringatan Penghapusan Permanen</h3>
                  <p className="text-amber-800 leading-relaxed">
                    Tindakan ini akan menghapus peserta ini beserta <strong>semua tiket terbit, data check-in, dan pesanan</strong> terkait secara permanen dari Supabase.
                  </p>
                </div>
              </div>

              {/* Summary Participant Info */}
              <div className="rounded-2xl border border-border bg-secondary/10 p-4 space-y-2 text-xs">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Nama Peserta:</span>
                  <strong className="text-navy-900 font-bold">{participant.full_name}</strong>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-mono text-navy-900">{participant.email}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">NIM:</span>
                  <span className="font-mono text-navy-900">{participant.nim || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kode Order:</span>
                  <span className="font-mono text-navy-900">{orderCodes || "-"}</span>
                </div>
              </div>

              {/* Actions Step 1 */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-navy-900 hover:bg-secondary/40 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition-all shadow-md active:scale-95"
                >
                  <span>Lanjutkan ke Konfirmasi Akhir</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2 */
            <form onSubmit={handleFinalDelete} className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900">
                <ShieldAlert className="h-6 w-6 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h3 className="font-bold text-rose-950">Verifikasi Keamanan Langkah 2/2</h3>
                  <p className="text-rose-900 leading-relaxed">
                    Untuk membuka kuncian tombol hapus permanen, silakan ketik kata <strong className="bg-rose-200 px-1 py-0.5 rounded font-mono">HAPUS</strong> di bawah ini.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-navy-900">
                  Konfirmasi Teks Keamanan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Ketik HAPUS di sini"
                  className="w-full rounded-xl border-2 border-rose-300 bg-white py-2.5 px-4 text-xs font-mono font-bold text-navy-900 uppercase focus:border-rose-600 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Actions Step 2 */}
              <div className="pt-3 flex items-center justify-between gap-2.5 border-t border-border">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-navy-900 hover:bg-secondary/40 transition-colors disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Kembali</span>
                </button>
                <button
                  type="submit"
                  disabled={loading || confirmText.trim().toUpperCase() !== "HAPUS"}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Hapus Permanen Dari Database</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
