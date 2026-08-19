"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Building,
  BookOpen,
  Loader2,
  Minus,
  Plus,
  ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveEvent } from "@/hooks/use-active-event";
import { eventDisplayName } from "@/lib/event-utils";

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
  const { event } = useActiveEvent();
  const displayName = eventDisplayName(event);

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
  const qtyParam = Number(searchParams.get('qty'));

  const emptyParticipant = (): Participant => ({ fullName: '', email: '', whatsapp: '', nim: '', faculty: 'Fakultas Ilmu Terapan', studyProgram: '', instagram: '' });

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

        const min = foundTicket.min_purchase || 1;
        const max = foundTicket.max_purchase || 5;
        const initialQty = Math.min(Math.max(Number.isFinite(qtyParam) && qtyParam >= min ? qtyParam : min, min), max);

        setTicket(foundTicket);
        setQuantity(initialQty);
        setParticipants(Array.from({ length: initialQty }, emptyParticipant));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Gagal memuat data tiket.");
      } finally {
        setLoading(false);
      }
    }
    fetchTicketData();
  }, [ticketId, inviteToken, qtyParam]);

  const handleQuantityChange = (amount: number) => {
    if (!ticket) return;
    const newQuantity = Math.max(ticket.min_purchase, Math.min(ticket.max_purchase, quantity + amount));
    setQuantity(newQuantity);

    const diff = newQuantity - participants.length;
    if (diff > 0) {
        setParticipants(prev => [...prev, ...Array.from({ length: diff }, emptyParticipant)]);
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    participants.forEach((p, i) => {
      const pErrors: Record<string, string> = {};
      if (!p.fullName.trim() || p.fullName.trim().length < 3) pErrors.fullName = "Nama lengkap minimal 3 karakter.";
      if (!p.email.trim() || !emailRegex.test(p.email.trim())) pErrors.email = "Email tidak valid.";
      if (!p.whatsapp.trim() || p.whatsapp.trim().length < 9) pErrors.whatsapp = "Nomor WhatsApp minimal 9 karakter.";
      if (!p.nim.trim() || p.nim.trim().length < 5) pErrors.nim = "NIM minimal 5 karakter.";
      if (!p.studyProgram.trim() || p.studyProgram.trim().length < 2) pErrors.studyProgram = "Program studi minimal 2 karakter.";
      if(Object.keys(pErrors).length > 0) isValid = false;
      errors[i] = pErrors;
    });
    if (!isValid) {
      setCheckoutError("Mohon periksa kembali data yang diisi.");
    }
    setFormErrors(errors);
    return isValid;
  };
  
  const [referralCode, setReferralCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [referralSuccessMsg, setReferralSuccessMsg] = useState('');
  const [referralErrorMsg, setReferralErrorMsg] = useState('');
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);

  const handleValidateReferral = async () => {
    if (!referralCode.trim() || !ticket || !event) return;
    setIsValidatingReferral(true);
    setReferralSuccessMsg('');
    setReferralErrorMsg('');
    try {
      const res = await fetch('/api/referrals/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: referralCode.trim(), eventId: event.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setDiscountAmount(0);
        setReferralErrorMsg(data.message || 'Kode referal tidak valid.');
        return;
      }
      // Calculate discount amount from discount preview
      const discount = data.discount;
      let discountAmount = 0;
      const unitPrice = ticket.final_price || 0;
      const subtotal = unitPrice * quantity;
      if (discount.type === 'PERCENTAGE') {
        discountAmount = Math.floor(subtotal * discount.value / 100);
        if (discount.max_discount) {
          discountAmount = Math.min(discountAmount, discount.max_discount);
        }
      } else if (discount.type === 'FIXED') {
        discountAmount = discount.value;
      }
      discountAmount = Math.min(discountAmount, subtotal);
      setDiscountAmount(discountAmount);
      setReferralSuccessMsg(`Kode referal valid! Diskon Rp ${discountAmount.toLocaleString('id-ID')}`);
    } catch (err: unknown) {
      setReferralErrorMsg(err instanceof Error ? err.message : 'Gagal memvalidasi kode referal.');
    } finally {
      setIsValidatingReferral(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForms() || !ticket) return;
    
    setIsSubmitting(true);
    setCheckoutError(null);

    const payload = {
      ticketSelections: [{ ticketId: ticket.id, quantity }],
      participants,
      inviteToken: inviteToken || undefined,
      referralCode: referralCode.trim() || undefined,
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
      
      const orderCode = result.orderCode;
      const totalAmount = result.total_amount;

      if (totalAmount === 0) {
        router.push(`/success?order=${orderCode}&type=free`);
      } else {
        router.push(`/payment?order=${orderCode}`);
      }

    } catch (err: unknown) {
      console.error('Checkout submission error:', err);
      setCheckoutError(err instanceof Error ? err.message : "Checkout gagal.");
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <Link
          href="/tiket"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-bold text-navy-900 shadow-sm hover:bg-secondary/40 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Pilih Tiket</span>
        </Link>
      </div>

       <section className="bg-secondary/40 border-b border-border py-10 px-4 sm:px-6 lg:px-8">
         <div className="max-w-4xl mx-auto text-center space-y-2">
           <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-900">
             Form Pendaftaran Peserta
           </h1>
<p className="text-sm sm:text-base text-navy-900/70 max-w-xl mx-auto">
              Isi data diri Anda dengan benar untuk penerbitan E-Ticket {displayName}.
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

                {/* Referral Code Input */}
                <div className="rounded-2xl border border-navy-800 bg-navy-900/60 p-4 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-ivory-200/80">Kode Referal / Promo (Opsional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Masukkan kode promo"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="w-full rounded-xl border border-navy-700 bg-navy-950 px-3 py-2 text-xs text-ivory-100 placeholder:text-ivory-200/40 uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleValidateReferral}
                      disabled={isValidatingReferral || !referralCode.trim()}
                      className="rounded-xl bg-gold-500 px-3 py-2 text-xs font-bold text-navy-950 hover:bg-gold-400 disabled:opacity-50"
                    >
                      {isValidatingReferral ? 'Cek...' : 'Terapkan'}
                    </button>
                  </div>
                  {referralSuccessMsg && <p className="text-xs text-emerald-400 font-semibold">{referralSuccessMsg}</p>}
                  {referralErrorMsg && <p className="text-xs text-rose-400 font-semibold">{referralErrorMsg}</p>}
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
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-400 font-semibold">
                        <span>Diskon Referal:</span>
                        <span>- Rp {discountAmount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                     <div className="border-t border-navy-800 pt-3 flex justify-between items-baseline">
                        <span className="font-bold text-ivory-100">Estimasi Total:</span>
                        <span className="font-display text-2xl font-extrabold text-gold-400">Rp {Math.max(0, subtotal - discountAmount).toLocaleString('id-ID')}</span>
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
