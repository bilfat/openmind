"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { Database, Search, ChevronLeft, ChevronRight, Edit3, Trash2, Download, CheckCircle2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { EditParticipantModal, ParticipantToEdit } from "@/components/admin/master-data/edit-participant-modal";
import { DeleteParticipantModal, ParticipantToDelete } from "@/components/admin/master-data/delete-participant-modal";

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
  orders: Array<{
    order_item_id: string;
    order?: { order_code: string; status: string };
    ticket_type?: { name: string; ticket_type: string };
    issued_ticket?: { ticket_code: string; status: string } | null;
  }>;
};

const PAGE_SIZE = 50;

function MasterDataPageContent() {
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [faculty, setFaculty] = useState("all");
  const [ticketType, setTicketType] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [allFaculties, setAllFaculties] = useState<string[]>([]);

  // Edit Modal State
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantToEdit | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Delete Modal State (2-Step Verification)
  const [selectedDeleteParticipant, setSelectedDeleteParticipant] = useState<ParticipantToDelete | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchParticipants = (controller?: AbortController) => {
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (faculty !== "all") params.set("faculty", faculty);
    if (ticketType !== "all") params.set("ticket_type", ticketType);

    const isInitialLoad = page === 1 && !searchTerm.trim() && faculty === "all" && ticketType === "all";
    if (!isInitialLoad) setIsFilterLoading(true);

    fetch(`/api/admin/participants?${params.toString()}`, {
      cache: "no-store",
      signal: controller?.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Gagal mengambil data peserta.");
        setParticipants(payload.items ?? []);
        setPagination(payload.pagination ?? { page, limit: PAGE_SIZE, total: 0, totalPages: 0 });
      })
      .catch((error) => {
        if (error.name !== "AbortError") console.error(error);
      })
      .finally(() => {
        setLoading(false);
        setIsFilterLoading(false);
      });
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchParticipants(controller);
    return () => controller.abort();
  }, [searchTerm, faculty, ticketType, page]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/participants?all_faculties=true", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (response.ok && payload.faculties) {
          setAllFaculties(payload.faculties);
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") console.error(error);
      });
    return () => controller.abort();
  }, []);

  const derivedFaculties = useMemo(
    () => [...new Set(participants.map((participant) => participant.faculty).filter(Boolean))],
    [participants]
  );
  const faculties = allFaculties.length > 0 ? allFaculties : derivedFaculties;

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
        const response = await fetch(`/api/admin/participants?${buildExportParams(currentPage).toString()}`, {
          cache: "no-store",
        });
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
      ]);
      const csv = [
        ["Order", "Nama", "NIM", "Fakultas", "Prodi", "Gmail", "No HP"],
        ...rows,
      ]
        .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
        .join("\n");
      const link = document.createElement("a");
      link.href = `data:text/csv;charset=utf-8,\uFEFF${encodeURIComponent(csv)}`;
      link.download = "master_data_participants.csv";
      link.click();
    } catch (error) {
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const handleEditClick = (participant: ParticipantRow) => {
    setSelectedParticipant({
      id: participant.id,
      full_name: participant.full_name,
      email: participant.email,
      whatsapp: participant.whatsapp,
      nim: participant.nim,
      faculty: participant.faculty,
      study_program: participant.study_program,
    });
    setIsEditOpen(true);
  };

  const handleDeleteClick = (participant: ParticipantRow) => {
    setSelectedDeleteParticipant({
      id: participant.id,
      full_name: participant.full_name,
      email: participant.email,
      nim: participant.nim,
      orders: participant.orders,
    });
    setIsDeleteOpen(true);
  };

  const handleEditSuccess = () => {
    fetchParticipants();
    setSuccessToast("Data peserta berhasil diperbarui!");
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleDeleteSuccess = () => {
    fetchParticipants();
    setSuccessToast("Data peserta berhasil dihapus secara permanen dari database!");
    setTimeout(() => setSuccessToast(null), 4000);
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
      {/* Toast Notification */}
      {successToast && (
        <div className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg border border-emerald-500 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span className="text-xs font-bold">{successToast}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 bg-white px-4 sm:px-5 py-3 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-base sm:text-lg font-bold text-navy-900">
              Master Data Peserta
            </h1>
            <span className="rounded-full bg-gold-500/10 px-2.5 py-0.5 text-[10px] font-bold text-gold-600 border border-gold-500/20">
              Super Admin Only
            </span>
          </div>
          <p className="text-[10px] sm:text-xs text-navy-900/70 mt-0.5">
            Kelola dan hapus data peserta uji coba. Perubahan/penghapusan otomatis tersinkronisasi di Supabase.
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
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 pl-10 pr-4 text-xs text-navy-900 placeholder:text-muted-foreground focus:border-gold-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Faculty Filter */}
          <div className="sm:col-span-3">
            <select
              value={faculty}
              onChange={(event) => {
                setFaculty(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
            >
              <option value="all">Semua Fakultas</option>
              {faculties.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          {/* Ticket Type Filter */}
          <div className="sm:col-span-3">
            <select
              value={ticketType}
              onChange={(event) => {
                setTicketType(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
            >
              <option value="all">Semua Tipe Tiket</option>
              <option value="FREE">FREE</option>
              <option value="PAID">PAID</option>
            </select>
          </div>
        </div>
      </div>

      {/* Participants Master Data Table */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          {loading || isFilterLoading ? (
            <div className="flex h-72 flex-col items-center justify-center gap-2.5 rounded-2xl border border-border bg-white shadow-sm">
              <LogoSpinner size={56} />
              <p className="text-xs font-semibold text-navy-900">Memuat master data peserta...</p>
            </div>
          ) : participants.length === 0 ? (
            <EmptyState
              icon={Database}
              title="Peserta tidak ditemukan"
              description="Tidak ada data peserta yang cocok dengan pencarian."
            />
          ) : (
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead className="bg-navy-900 text-gold-400 uppercase font-bold text-[10px] tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-4 text-center border-b border-navy-700">No</th>
                  <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Order</th>
                  <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Nama Peserta</th>
                  <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">NIM</th>
                  <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Email</th>
                  <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">WhatsApp</th>
                  <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Fakultas / Prodi</th>
                  <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Aksi</th>
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
                    <td className="px-5 py-4 font-mono whitespace-nowrap border-b border-border/70 border-l border-border/70 text-center">
                      {participant.orders.map((order) => order.order?.order_code ?? "-").join(", ")}
                    </td>
                    <td className="px-5 py-4 border-b border-border/70 border-l border-border/70">
                      <strong className="block text-navy-900 font-bold">{participant.full_name}</strong>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap border-b border-border/70 border-l border-border/70 text-center font-mono">
                      {participant.nim || "-"}
                    </td>
                    <td className="px-5 py-4 border-b border-border/70 border-l border-border/70">
                      {participant.email}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap border-b border-border/70 border-l border-border/70 text-center font-mono">
                      {participant.whatsapp}
                    </td>
                    <td className="px-5 py-4 border-b border-border/70 border-l border-border/70">
                      <div className="font-semibold text-navy-900">{participant.faculty || "-"}</div>
                      <div className="text-[10px] text-navy-900/60">{participant.study_program || "-"}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap border-b border-border/70 border-l border-border/70 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditClick(participant)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-bold text-gold-400 hover:bg-navy-800 transition-all shadow-sm active:scale-95"
                          title="Edit Master Data"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(participant)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition-all shadow-sm active:scale-95"
                          title="Hapus Data Peserta (2-Step Verification)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
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

      {/* Edit Modal */}
      <EditParticipantModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={handleEditSuccess}
        participant={selectedParticipant}
      />

      {/* Delete Modal (2-Step Verification) */}
      <DeleteParticipantModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={handleDeleteSuccess}
        participant={selectedDeleteParticipant}
      />
    </div>
  );
}

export default function MasterDataPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-sm font-semibold text-gold-600 animate-pulse">
          Memuat Master Data Peserta...
        </div>
      }
    >
      <MasterDataPageContent />
    </Suspense>
  );
}
