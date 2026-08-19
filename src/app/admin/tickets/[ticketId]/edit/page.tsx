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
  const [ticket, setTicket] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTicket() {
      if (!ticketId) return;
      try {
        const res = await fetch(`/api/admin/tickets/${ticketId}`);
        const json = await res.json();
        if (json.success) {
          const t = json.data;
          setTicket({
            id: t.id,
            name: t.name,
            description: t.description || "",
            type: t.ticket_type,
            visibility: t.visibility,
            price: Number(t.base_price),
            discountPercentage: Number(t.discount_percentage),
            finalPrice: Number(t.final_price),
            quota: Number(t.quota),
            issued: Number(t.quota) - Number(t.remaining_quota || t.quota),
            minPurchase: Number(t.min_purchase),
            maxPurchase: Number(t.max_purchase),
            salesStart: t.sales_start_at.substring(0, 16),
            salesEnd: t.sales_end_at.substring(0, 16),
            status: t.status,
            badge: t.badge || "EXTEND",
            benefits: t.benefits || []
          });
        }
      } catch (err) {
        console.error("Failed to load ticket:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTicket();
  }, [ticketId]);

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
