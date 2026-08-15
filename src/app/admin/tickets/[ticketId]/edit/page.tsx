"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TicketType } from "@/data/tickets";
import { getTicketById } from "@/lib/ticket-store";
import { TicketForm } from "@/components/admin/tickets/ticket-form";
import { ArrowLeft } from "lucide-react";

export default function EditTicketPage() {
  const params = useParams();
  const ticketId = (params?.ticketId as string) || "";
  const [ticket] = useState<TicketType | null>(() =>
    ticketId ? getTicketById(ticketId) : null
  );
  const loading = false;

  if (loading) {
    return (
      <div className="p-12 text-center text-sm font-semibold text-gold-600 animate-pulse">
        Memuat Konfigurasi Tiket...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Tiket tidak ditemukan atau telah dihapus.
        </p>
        <Link
          href="/admin/tickets"
          className="inline-flex items-center gap-1.5 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-navy-950"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Daftar Tiket</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <TicketForm initialData={ticket} isEdit />
    </div>
  );
}
