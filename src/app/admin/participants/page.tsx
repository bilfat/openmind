"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Search, Download, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

type ParticipantRow = {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string;
  nim: string;
  faculty: string;
  study_program: string;
  is_present: boolean;
  checked_in_at: string | null;
  orders: Array<{ order_item_id: string; order?: { order_code: string; status: string }; ticket_type?: { name: string; ticket_type: string }; issued_ticket?: { ticket_code: string; status: string } | null }>;
};

const PAGE_SIZE = 50;

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [faculty, setFaculty] = useState("all");
  const [ticketType, setTicketType] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (faculty !== "all") params.set("faculty", faculty);
    if (ticketType !== "all") params.set("ticket_type", ticketType);
    fetch(`/api/admin/participants?${params.toString()}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Gagal mengambil data peserta.");
        setParticipants(payload.items ?? []);
        setPagination(payload.pagination ?? { page, limit: PAGE_SIZE, total: 0, totalPages: 0 });
      })
      .catch((error) => { if (error.name !== "AbortError") console.error(error); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [searchTerm, faculty, ticketType, page]);

  const faculties = useMemo(() => [...new Set(participants.map((participant) => participant.faculty).filter(Boolean))], [participants]);

  const buildExportParams = (pageNumber: number) => {
    const params = new URLSearchParams({ page: String(pageNumber), limit: String(PAGE_SIZE) });
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (faculty !== "all") params.set("faculty", faculty);
    if (ticketType !== "all") params.set("ticket_type", ticketType);
    return params;
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const allRows: ParticipantRow[] = [];
      let currentPage = 1;
      let totalPages = 1;
      do {
        const response = await fetch(`/api/admin/participants?${buildExportParams(currentPage).toString()}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Gagal mengambil data peserta.");
        allRows.push(...(payload.items ?? []));
        totalPages = payload.pagination?.totalPages ?? totalPages;
        currentPage += 1;
      } while (currentPage <= totalPages);

      const rows = allRows.map((participant) => [
        participant.orders.map((order) => order.order?.order_code ?? "-").join("; "),
        participant.full_name,
        participant.nim,
        participant.faculty,
        participant.study_program,
        participant.email,
        participant.whatsapp,
        participant.is_present ? "Sudah Hadir" : "Belum Hadir",
      ]);
      const csv = [["Order", "Nama", "NIM", "Fakultas", "Prodi", "Gmail", "No HP", "Keterangan"], ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
      const link = document.createElement("a");
      link.href = `data:text/csv;charset=utf-8,\uFEFF${encodeURIComponent(csv)}`;
      link.download = "open_mind_2026_participants.csv";
      link.click();
    } catch (error) {
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const fromCount = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const toCount = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold font-display text-navy-900">Participants</h1>
        <button onClick={exportCSV} disabled={exporting} className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-semibold hover:bg-navy-700 transition btn-scale touch-target disabled:opacity-50"><Download className="w-4 h-4" />{exporting ? "Mengekspor..." : "Export CSV"}</button>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" placeholder="Search by name, NIM, or email..." value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2 border rounded-lg" aria-label="Cari peserta" /></div>
          <select value={faculty} onChange={(event) => { setFaculty(event.target.value); setPage(1); }} className="w-full px-4 py-2 border rounded-lg bg-white" aria-label="Filter fakultas"><option value="all">All Faculties</option>{faculties.map((value) => <option key={value} value={value}>{value}</option>)}</select>
          <select value={ticketType} onChange={(event) => { setTicketType(event.target.value); setPage(1); }} className="w-full px-4 py-2 border rounded-lg bg-white" aria-label="Filter tipe tiket"><option value="all">All Ticket Types</option><option value="FREE">Free</option><option value="PAID">Paid</option></select>
        </div>
        {loading ? <div className="py-12 text-center text-gray-500">Memuat peserta...</div> : participants.length === 0 ? <EmptyState icon={Users} title="Peserta tidak ditemukan" description="Tidak ada peserta yang sesuai dengan filter saat ini." /> : <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-gray-700 uppercase bg-gray-50"><tr><th className="px-6 py-3">No</th><th className="px-6 py-3">Order</th><th className="px-6 py-3">Nama</th><th className="px-6 py-3">NIM</th><th className="px-6 py-3">Fakultas</th><th className="px-6 py-3">Prodi</th><th className="px-6 py-3">Gmail</th><th className="px-6 py-3">No HP</th><th className="px-6 py-3">Keterangan</th></tr></thead><tbody>{participants.map((participant, index) => <tr key={participant.id} className="bg-white border-b hover:bg-gray-50"><td className="px-6 py-4 text-gray-500">{(pagination.page - 1) * pagination.limit + index + 1}</td><td className="px-6 py-4 font-mono whitespace-nowrap">{participant.orders.map((order) => order.order?.order_code ?? "-").join(", ")}</td><td className="px-6 py-4 font-medium text-gray-900">{participant.full_name}</td><td className="px-6 py-4 whitespace-nowrap">{participant.nim}</td><td className="px-6 py-4">{participant.faculty}</td><td className="px-6 py-4">{participant.study_program}</td><td className="px-6 py-4">{participant.email}</td><td className="px-6 py-4 whitespace-nowrap">{participant.whatsapp}</td><td className="px-6 py-4 whitespace-nowrap">{participant.is_present ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700"><CheckCircle2 className="h-3 w-3" />Sudah Hadir</span> : <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-700"><AlertTriangle className="h-3 w-3" />Belum Hadir</span>}</td></tr>)}</tbody></table></div>}
        {!loading && participants.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-4">
            <p className="text-sm text-gray-500">Menampilkan <strong className="text-navy-900">{fromCount}</strong>–<strong className="text-navy-900">{toCount}</strong> dari <strong className="text-navy-900">{pagination.total}</strong> peserta</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-navy-900 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="h-4 w-4" /> Sebelumnya</button>
              <span className="text-sm font-bold text-navy-900 px-2">Halaman {pagination.page} / {Math.max(1, pagination.totalPages)}</span>
              <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-navy-900 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Berikutnya <ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
