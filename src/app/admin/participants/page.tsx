"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Search, Download } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

type ParticipantRow = {
  id: string;
  full_name: string;
  email: string;
  nim: string;
  faculty: string;
  study_program: string;
  orders: Array<{ order_item_id: string; order?: { order_code: string; status: string }; ticket_type?: { name: string; ticket_type: string }; issued_ticket?: { ticket_code: string; status: string } | null }>;
};

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [faculty, setFaculty] = useState("all");
  const [ticketType, setTicketType] = useState("all");
  const [loading, setLoading] = useState(true);

   useEffect(() => {
     const controller = new AbortController();
     const params = new URLSearchParams({ page: "1", limit: "100" });
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (faculty !== "all") params.set("faculty", faculty);
    if (ticketType !== "all") params.set("ticket_type", ticketType);
    fetch(`/api/admin/participants?${params.toString()}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Gagal mengambil data peserta.");
        setParticipants(payload.items ?? []);
      })
      .catch((error) => { if (error.name !== "AbortError") console.error(error); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [searchTerm, faculty, ticketType]);

  const faculties = useMemo(() => [...new Set(participants.map((participant) => participant.faculty).filter(Boolean))], [participants]);

  const exportCSV = () => {
    const rows = participants.map((participant) => [participant.full_name, participant.email, participant.nim, participant.faculty, participant.study_program, participant.orders.map((order) => order.ticket_type?.name ?? "-").join("; ")]);
    const csv = [["Name", "Email", "NIM", "Faculty", "Study Program", "Tickets"], ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = "open_mind_2026_participants.csv";
    link.click();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold font-display text-navy-900">Participants</h1>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-semibold hover:bg-navy-700 transition btn-scale touch-target"><Download className="w-4 h-4" />Export CSV</button>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" placeholder="Search by name, NIM, or email..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" aria-label="Cari peserta" /></div>
          <select value={faculty} onChange={(event) => setFaculty(event.target.value)} className="w-full px-4 py-2 border rounded-lg bg-white" aria-label="Filter fakultas"><option value="all">All Faculties</option>{faculties.map((value) => <option key={value} value={value}>{value}</option>)}</select>
          <select value={ticketType} onChange={(event) => setTicketType(event.target.value)} className="w-full px-4 py-2 border rounded-lg bg-white" aria-label="Filter tipe tiket"><option value="all">All Ticket Types</option><option value="FREE">Free</option><option value="PAID">Paid</option></select>
        </div>
        {loading ? <div className="py-12 text-center text-gray-500">Memuat peserta...</div> : participants.length === 0 ? <EmptyState icon={Users} title="Peserta tidak ditemukan" description="Tidak ada peserta yang sesuai dengan filter saat ini." /> : <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-gray-700 uppercase bg-gray-50"><tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">NIM</th><th className="px-6 py-3">Faculty</th><th className="px-6 py-3">Ticket</th><th className="px-6 py-3">Order</th></tr></thead><tbody>{participants.map((participant) => <tr key={participant.id} className="bg-white border-b hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">{participant.full_name}</td><td className="px-6 py-4">{participant.nim}</td><td className="px-6 py-4">{participant.faculty}</td><td className="px-6 py-4">{participant.orders.map((order) => <div key={order.order_item_id}>{order.ticket_type?.name ?? "-"}{order.issued_ticket ? ` · ${order.issued_ticket.ticket_code}` : " · Unissued"}</div>)}</td><td className="px-6 py-4">{participant.orders.map((order) => order.order?.order_code ?? "-").join(", ")}</td></tr>)}</tbody></table></div>}
      </div>
    </div>
  );
}
