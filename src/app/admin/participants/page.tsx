"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Search, Download, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Filter, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { Suspense } from "react";

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

function ParticipantsPageContent() {
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [faculty, setFaculty] = useState("all");
  const [ticketType, setTicketType] = useState("all");
  const [attendance, setAttendance] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [allFaculties, setAllFaculties] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (faculty !== "all") params.set("faculty", faculty);
    if (ticketType !== "all") params.set("ticket_type", ticketType);
    if (attendance !== "all") params.set("attendance", attendance);
    
    const isInitialLoad = page === 1 && !searchTerm.trim() && faculty === "all" && ticketType === "all" && attendance === "all";
    if (!isInitialLoad) setIsFilterLoading(true);
    
    fetch(`/api/admin/participants?${params.toString()}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Gagal mengambil data peserta.");
        setParticipants(payload.items ?? []);
        setPagination(payload.pagination ?? { page, limit: PAGE_SIZE, total: 0, totalPages: 0 });
      })
      .catch((error) => { if (error.name !== "AbortError") console.error(error); })
      .finally(() => { setLoading(false); setIsFilterLoading(false); });
    return () => controller.abort();
  }, [searchTerm, faculty, ticketType, attendance, page]);

  // Fetch all faculties for the filter dropdown (independent of current filters)
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/participants?all_faculties=true", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (response.ok && payload.faculties) {
          setAllFaculties(payload.faculties);
        }
      })
      .catch((error) => { if (error.name !== "AbortError") console.error(error); });
    return () => controller.abort();
  }, []);

  const faculties = allFaculties.length > 0 ? allFaculties : useMemo(() => [...new Set(participants.map((participant) => participant.faculty).filter(Boolean))], [participants]);

  const buildExportParams = (pageNumber: number) => {
    const params = new URLSearchParams({ page: String(pageNumber), limit: String(PAGE_SIZE) });
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (faculty !== "all") params.set("faculty", faculty);
    if (ticketType !== "all") params.set("ticket_type", ticketType);
    if (attendance !== "all") params.set("attendance", attendance);
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

  const pageNumbers: number[] = [];
  {
    const total = Math.max(1, pagination.totalPages);
    const current = pagination.page;
    const windowStart = Math.max(1, Math.min(current - 2, total - 4));
    const windowEnd = Math.min(total, windowStart + 4);
    for (let p = windowStart; p <= windowEnd; p++) pageNumbers.push(p);
  }

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 bg-white px-4 sm:px-5 py-3 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="font-display text-base sm:text-lg font-bold text-navy-900">
            Manajemen Peserta
          </h1>
          <p className="text-[10px] sm:text-xs text-navy-900/70 mt-0.5">
            Daftar peserta dengan tiket telah terbit (per pax).
          </p>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-emerald-700 transition-all shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          <span>{exporting ? "Mengekspor..." : "Ekspor CSV"}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-border bg-white px-4 sm:px-5 py-3 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nama, NIM, atau email..."
              value={searchTerm}
              onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }}
              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 pl-10 pr-4 text-xs text-navy-900 placeholder:text-muted-foreground focus:border-gold-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Faculty Filter */}
          <div className="sm:col-span-3">
            <select
              value={faculty}
              onChange={(event) => { setFaculty(event.target.value); setPage(1); }}
              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
            >
              <option value="all">Semua Fakultas</option>
              {faculties.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          {/* Ticket Type Filter */}
          <div className="sm:col-span-3">
            <select
              value={ticketType}
              onChange={(event) => { setTicketType(event.target.value); setPage(1); }}
              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
            >
              <option value="all">Semua Tipe Tiket</option>
              <option value="FREE">FREE</option>
              <option value="PAID">PAID</option>
            </select>
          </div>

          {/* Attendance Filter */}
          <div className="sm:col-span-3">
            <select
              value={attendance}
              onChange={(event) => { setAttendance(event.target.value); setPage(1); }}
              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="present">Sudah Hadir</option>
              <option value="absent">Belum Hadir</option>
            </select>
          </div>
        </div>
      </div>

      {/* Participants Table */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="flex h-72 flex-col items-center justify-center gap-2.5 rounded-2xl border border-border bg-white shadow-sm">
              <LogoSpinner size={56} />
              <p className="text-xs font-semibold text-navy-900">Memuat data...</p>
            </div>
          ) : isFilterLoading ? (
            <div className="flex h-72 flex-col items-center justify-center gap-2.5 rounded-2xl border border-border bg-white shadow-sm">
              <LogoSpinner size={56} />
              <p className="text-xs font-semibold text-navy-900">Memuat data...</p>
            </div>
          ) : participants.length === 0 ? (
            <EmptyState icon={Users} title="Peserta tidak ditemukan" description="Tidak ada peserta yang sesuai dengan filter saat ini." />
          ) : (
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead className="bg-navy-900 text-gold-400 uppercase font-bold text-[10px] tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-4 text-center border-b border-navy-700">No</th>
                  <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Order</th>
                  <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Nama</th>
                  <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">NIM</th>
                  <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Fakultas</th>
                  <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Prodi</th>
                  <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Gmail</th>
                  <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">No HP</th>
                  <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((participant, index) => (
                  <tr
                    key={participant.id}
                    className={cn(
                      "transition-colors",
                      index % 2 === 0 ? "bg-white" : "bg-secondary/30",
                      "hover:bg-secondary/50"
                    )}
                  >
                    <td className="px-5 py-4 font-mono font-bold text-navy-900 whitespace-nowrap text-center border-b border-border/70">
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </td>
                    <td className="px-5 py-4 font-mono whitespace-nowrap border-b border-border/70 border-l border-border/70">
                      {participant.orders.map((order) => order.order?.order_code ?? "-").join(", ")}
                    </td>
                    <td className="px-5 py-4 border-b border-border/70 border-l border-border/70">
                      <strong className="block text-navy-900 font-bold">{participant.full_name}</strong>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap border-b border-border/70 border-l border-border/70">
                      {participant.nim}
                    </td>
                    <td className="px-5 py-4 border-b border-border/70 border-l border-border/70">
                      {participant.faculty}
                    </td>
                    <td className="px-5 py-4 border-b border-border/70 border-l border-border/70">
                      {participant.study_program}
                    </td>
                    <td className="px-5 py-4 border-b border-border/70 border-l border-border/70">
                      {participant.email}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap border-b border-border/70 border-l border-border/70">
                      {participant.whatsapp}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap border-b border-border/70 border-l border-border/70">
                      {participant.is_present ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Sudah Hadir
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                          <AlertTriangle className="h-3 w-3" />
                          Belum Hadir
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {!loading && participants.length > 0 && (
        <div className="rounded-2xl border border-border bg-white shadow-sm px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Menampilkan {fromCount}–{toCount} dari {pagination.total} peserta
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-xs font-semibold text-navy-900 hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </button>

            {Math.max(1, pagination.totalPages) > 1 &&
              pageNumbers.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={cn(
                    "min-w-9 rounded-xl px-3 py-2 text-xs font-bold transition-colors",
                    p === pagination.page
                      ? "bg-navy-900 text-gold-400 shadow-sm"
                      : "bg-secondary/30 text-navy-900/70 hover:bg-secondary hover:text-navy-900"
                  )}
                >
                  {p}
                </button>
              ))}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(Math.max(1, pagination.totalPages), p + 1))}
              disabled={page >= pagination.totalPages}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-xs font-semibold text-navy-900 hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="hidden sm:inline">Selanjutnya</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ParticipantsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-sm font-semibold text-gold-600 animate-pulse">
          Memuat Data Peserta...
        </div>
      }
    >
      <ParticipantsPageContent />
    </Suspense>
  );
}