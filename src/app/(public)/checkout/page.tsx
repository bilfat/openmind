"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Ticket,
  User,
  Mail,
  Phone,
  GraduationCap,
  Building,
  BookOpen,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Tag,
  Check,
  X,
  Loader2,
  Minus,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Participant {
    fullName: string;
    email: string;
    whatsapp: string;
    nim: string;
    faculty: string;
    studyProgram: string;
    instagram: string;
}

interface Ticket {
    id: string;
    name: string;
    min_purchase: number;
    max_purchase: number;
    final_price: number;
}

const facultyOptions = [
    { value: "Fakultas Ilmu Terapan", label: "FIT — Fakultas Ilmu Terapan" },
    { value: "Fakultas Industri Kreatif", label: "FIK — Fakultas Industri Kreatif" },
    { value: "Fakultas Informatika", label: "FIF — Fakultas Informatika" },
    { value: "Fakultas Teknik Elektro", label: "FTE — Fakultas Teknik Elektro" },
    { value: "Fakultas Rekayasa Industri", label: "FRI — Fakultas Rekayasa Industri" },
    { value: "Fakultas Ekonomi dan Bisnis", label: "FEB — Fakultas Ekonomi dan Bisnis" },
    { value: "Fakultas Komunikasi Sosial", label: "FKS — Fakultas Komunikasi Sosial" },
  ];
  

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [participants, setParticipants] = useState<Participant[]>([
    { fullName: '', email: '', whatsapp: '', nim: '', faculty: 'Fakultas Ilmu Terapan', studyProgram: '', instagram: '' }
  ]);
  const [formErrors, setFormErrors] = useState<Record<string, string>[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  
  const ticketId = searchParams.get('ticket');
  const inviteToken = searchParams.get('invite');

  useEffect(() => {
    async function fetchTicketData() {
      if (!ticketId) {
        setError("ID tiket tidak ditemukan di URL.");
        setLoading(false);
        return;
      }
      
      const apiUrl = inviteToken ? `/api/invite/${inviteToken}` : `/api/tickets/public`;
      
      try {
        const res = await fetch(apiUrl);
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.message || "Gagal memuat data tiket.");
        }
        
        let foundTicket: Ticket | undefined;
        if(inviteToken) {
            foundTicket = json.data;
        } else {
            foundTicket = json.data.find((t: Ticket) => t.id === ticketId);
        }

        if (!foundTicket) {
          throw new Error("Tiket yang diminta tidak ditemukan atau tidak valid.");
        }
        
        setTicket(foundTicket);
        setQuantity(foundTicket.min_purchase || 1);
        setParticipants(Array(foundTicket.min_purchase || 1).fill({ fullName: '', email: '', whatsapp: '', nim: '', faculty: 'Fakultas Ilmu Terapan', studyProgram: '', instagram: '' }));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTicketData();
  }, [ticketId, inviteToken]);

  const handleQuantityChange = (amount: number) => {
    if (!ticket) return;
    const newQuantity = Math.max(ticket.min_purchase, Math.min(ticket.max_purchase, quantity + amount));
    setQuantity(newQuantity);

    const diff = newQuantity - participants.length;
    if (diff > 0) {
        setParticipants(prev => [...prev, ...Array(diff).fill({ fullName: '', email: '', whatsapp: '', nim: '', faculty: 'Fakultas Ilmu Terapan', studyProgram: '', instagram: '' })]);
    } else if (diff < 0) {
        setParticipants(prev => prev.slice(0, newQuantity));
    }
  };

  const handleParticipantChange = (index: number, field: keyof Participant, value: string) => {
    const newParticipants = [...participants];
    newParticipants[index][field] = value;
    setParticipants(newParticipants);
  };
  
  const validateForms = () => {
    const errors: Record<string, string>[] = [];
    let isValid = true;
    participants.forEach((p, i) => {
      const pErrors: Record<string, string> = {};
      if (!p.fullName.trim()) pErrors.fullName = "Nama lengkap wajib diisi.";
      if (!p.email.trim() || !p.email.includes('@')) pErrors.email = "Email valid wajib diisi.";
      if (!p.whatsapp.trim() || p.whatsapp.length < 9) pErrors.whatsapp = "Nomor WhatsApp aktif wajib diisi.";
      if (!p.nim.trim()) pErrors.nim = "NIM mahasiswa wajib diisi.";
      if (!p.studyProgram.trim()) pErrors.studyProgram = "Program studi wajib diisi.";
      if(Object.keys(pErrors).length > 0) isValid = false;
      errors[i] = pErrors;
    });
    setFormErrors(errors);
    return isValid;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForms() || !ticket) return;
    
    setIsSubmitting(true);
    setCheckoutError(null);

    const payload = {
      ticketSelections: [{ ticketId: ticket.id, quantity }],
      participants,
      inviteToken,
      // referralCode will be added later
    };

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.message || "Checkout gagal.");
      }
      
      const orderId = result.orderId;
      const totalAmount = result.total_amount;

      if (totalAmount === 0) {
        router.push(`/success?order=${orderId}&type=free`);
      } else {
        router.push(`/payment?order=${orderId}`);
      }

    } catch (err: any) {
      setCheckoutError(err.message);
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-40">Memuat data tiket...</div>;
  if (error) return <div className="text-center py-40 text-red-500">Error: {error}</div>;
  if (!ticket) return <div className="text-center py-40">Tiket tidak ditemukan.</div>;

  const unitPrice = ticket.final_price || 0;
  const subtotal = unitPrice * quantity;

  return (
    <div className="pt-24 pb-20">
       <section className="bg-secondary/40 border-b border-border py-10 px-4 sm:px-6 lg:px-8">
         <div className="max-w-4xl mx-auto text-center space-y-2">
           <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-900">
             Form Pendaftaran Peserta
           </h1>
           <p className="text-sm sm:text-base text-navy-900/70 max-w-xl mx-auto">
             Isi data diri Anda dengan benar untuk penerbitan E-Ticket OPEN MIND 2026.
           </p>
         </div>
       </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-border bg-white p-6 sm:p-10 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-navy-900">
                    Data Diri Peserta ({quantity})
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Semua kolom bertanda bintang (*) wajib diisi.
                  </p>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                {participants.map((p, index) => (
                  <div key={index} className="space-y-5 border-b border-border pb-6 last:border-b-0">
                    <h3 className="font-bold text-navy-900 text-base">Peserta #{index + 1}</h3>
                    
                    {/* Nama Lengkap */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">Nama Lengkap *</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="text" placeholder="Masukkan nama lengkap" value={p.fullName} onChange={e => handleParticipantChange(index, 'fullName', e.target.value)} className={cn("w-full rounded-xl border bg-secondary/20 py-3 pl-10 pr-4", formErrors[index]?.fullName && "border-destructive")} />
                      </div>
                      {formErrors[index]?.fullName && <p className="mt-1 text-xs text-destructive">{formErrors[index].fullName}</p>}
                    </div>

                    {/* Email & WA */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">Email *</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input type="email" placeholder="contoh@email.com" value={p.email} onChange={e => handleParticipantChange(index, 'email', e.target.value)} className={cn("w-full rounded-xl border bg-secondary/20 py-3 pl-10 pr-4", formErrors[index]?.email && "border-destructive")} />
                            </div>
                            {formErrors[index]?.email && <p className="mt-1 text-xs text-destructive">{formErrors[index].email}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">WhatsApp *</label>
                            <div className="relative">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input type="tel" placeholder="08123456789" value={p.whatsapp} onChange={e => handleParticipantChange(index, 'whatsapp', e.target.value)} className={cn("w-full rounded-xl border bg-secondary/20 py-3 pl-10 pr-4", formErrors[index]?.whatsapp && "border-destructive")} />
                            </div>
                            {formErrors[index]?.whatsapp && <p className="mt-1 text-xs text-destructive">{formErrors[index].whatsapp}</p>}
                        </div>
                    </div>
                    {/* NIM */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">NIM *</label>
                       <div className="relative">
                        <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="text" placeholder="6706220014" value={p.nim} onChange={e => handleParticipantChange(index, 'nim', e.target.value)} className={cn("w-full rounded-xl border bg-secondary/20 py-3 pl-10 pr-4", formErrors[index]?.nim && "border-destructive")} />
                      </div>
                      {formErrors[index]?.nim && <p className="mt-1 text-xs text-destructive">{formErrors[index].nim}</p>}
                    </div>

                    {/* Fakultas & Prodi */}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">Fakultas *</label>
                             <div className="relative">
                                <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <select value={p.faculty} onChange={e => handleParticipantChange(index, 'faculty', e.target.value)} className="w-full appearance-none rounded-xl border bg-secondary/20 py-3 pl-10 pr-4">
                                    {facultyOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                </select>
                            </div>
                        </div>
                         <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">Prodi *</label>
                            <div className="relative">
                                <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input type="text" placeholder="D3 Sistem Informasi" value={p.studyProgram} onChange={e => handleParticipantChange(index, 'studyProgram', e.target.value)} className={cn("w-full rounded-xl border bg-secondary/20 py-3 pl-10 pr-4", formErrors[index]?.studyProgram && "border-destructive")} />
                            </div>
                            {formErrors[index]?.studyProgram && <p className="mt-1 text-xs text-destructive">{formErrors[index].studyProgram}</p>}
                        </div>
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 border-t border-border">
                   {checkoutError && <div className="mb-4 text-center text-sm text-destructive bg-destructive/10 p-3 rounded-xl">{checkoutError}</div>}
                  <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-500 py-4 text-base font-bold text-navy-950 disabled:opacity-50">
                    {isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" /> <span>Memproses...</span></> : (subtotal > 0 ? "Lanjut ke Pembayaran" : "Dapatkan E-Ticket Gratis")}
                  </button>
                </div>
              </form>
            </div>
          </div>
          
          <div className="lg:col-span-5 sticky top-28">
            <div className="rounded-3xl border border-gold-500/30 bg-navy-950 p-6 sm:p-8 text-ivory-100 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-navy-800 pb-4">
                    <h3 className="font-display text-lg font-bold text-ivory-100">Ringkasan Pesanan</h3>
                    <Link href="/tiket" className="text-xs font-semibold text-gold-400">Ubah</Link>
                </div>
                
                <div className="rounded-2xl border border-gold-500/20 bg-navy-900/80 p-5 space-y-4">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gold-400">TIKET TERPILIH</span>
                        <h4 className="font-display text-xl font-bold text-ivory-100">{ticket.name}</h4>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                        <span>Kuantitas:</span>
                        <div className="flex items-center gap-3 rounded-full bg-navy-950 border border-navy-800 p-1">
                            <button onClick={() => handleQuantityChange(-1)} disabled={quantity <= ticket.min_purchase} className="p-1.5 rounded-full bg-navy-800 disabled:opacity-30"><Minus className="h-3 w-3" /></button>
                            <span className="font-bold w-4 text-center">{quantity}</span>
                            <button onClick={() => handleQuantityChange(1)} disabled={quantity >= ticket.max_purchase} className="p-1.5 rounded-full bg-navy-800 disabled:opacity-30"><Plus className="h-3 w-3" /></button>
                        </div>
                    </div>
                </div>

                {/* Pricing summary - all client side calculations are for display only */}
                <div className="space-y-2.5 text-sm text-ivory-200/80">
                    <div className="flex justify-between">
                        <span>Harga Satuan:</span>
                        <span>Rp {unitPrice.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                    </div>
                     <div className="border-t border-navy-800 pt-3 flex justify-between items-baseline">
                        <span className="font-bold text-ivory-100">Estimasi Total:</span>
                        <span className="font-display text-2xl font-extrabold text-gold-400">Rp {subtotal.toLocaleString('id-ID')}</span>
                    </div>
                    <p className="text-[11px] text-ivory-200/50 text-center pt-2">Total tagihan final akan dihitung oleh server saat checkout, termasuk diskon jika ada.</p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="text-center py-40">Memuat...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
