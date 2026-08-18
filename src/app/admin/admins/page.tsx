"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Edit, Trash2, Shield, ShieldCheck,
  Search, X, Eye, EyeOff, Loader2, UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface AdminProfile {
  id: string;
  full_name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN";
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
  updated_at: string;
}

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { success, error, warning } = useToast();

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingAdmin, setDeletingAdmin] = useState<AdminProfile | null>(null);

  const [editingAdmin, setEditingAdmin] = useState<AdminProfile | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "50" });
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/admins?${params.toString()}`);
      const json = await res.json();

      if (res.status === 403) {
        throw new Error("Akses Ditolak: Hanya Super Admin yang dapat mengakses manajemen admin.");
      }

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat daftar admin.");
      }

      setAdmins(json.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat mengambil data admin.";
      error(message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, error]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formPassword) return;

    setIsSaving(true);

    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal membuat admin baru.");
      }

      success(`Admin "${formName}" berhasil dibuat!`);
      setShowInviteModal(false);
      setFormName("");
      setFormEmail("");
      setFormPassword("");
      fetchAdmins();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal membuat admin baru.";
      error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    setIsSaving(true);

    try {
      const bodyPayload: Record<string, string> = {
        full_name: formName.trim(),
        status: formStatus,
      };
      if (formPassword.trim()) {
        bodyPayload.password = formPassword.trim();
      }

      const res = await fetch(`/api/admin/admins/${editingAdmin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memperbarui admin.");
      }

      success(`Admin "${formName}" berhasil diperbarui!`);
      setShowEditModal(false);
      setEditingAdmin(null);
      fetchAdmins();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal memperbarui admin.";
      error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deletingAdmin) return;

    try {
      const res = await fetch(`/api/admin/admins/${deletingAdmin.id}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus admin.");
      }

      success(`Admin "${deletingAdmin.full_name}" berhasil dihapus.`);
      setDeletingAdmin(null);
      fetchAdmins();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal menghapus admin.";
      error(message);
    }
  };

  const openEdit = (admin: AdminProfile) => {
    setEditingAdmin(admin);
    setFormName(admin.full_name);
    setFormEmail(admin.email);
    setFormPassword("");
    setFormStatus(admin.status);
    setShowEditModal(true);
  };

  const openDelete = (admin: AdminProfile) => {
    setDeletingAdmin(admin);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-600 border border-gold-500/20 mb-2">
            <UserCog className="h-3.5 w-3.5" />
            <span>MANAJEMEN ADMIN (SUPER ADMIN ONLY)</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">
            Daftar Admin & Hak Akses
          </h1>
          <p className="text-xs sm:text-sm text-navy-900/70">
            Kelola akun pengelola event, buat akun admin baru, dan ubah status atau kata sandi admin secara real-time.
          </p>
        </div>

        <button
          onClick={() => {
            setFormName("");
            setFormEmail("");
            setFormPassword("");
            setShowInviteModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-2xl bg-gold-500 px-5 py-3 text-xs font-bold text-navy-955 hover:bg-gold-400 shadow-md transition"
        >
          <Plus className="h-4 w-4" />
          <span>+ Buat Admin Baru</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border bg-secondary/20 py-2 pl-9 pr-4 text-xs"
          />
        </div>
      </div>

      {/* Admin Table */}
      <div className="rounded-3xl border border-border bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-navy-900">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-gold-500 mb-2" />
            <span>Memuat data admin dari server...</span>
          </div>
        ) : admins.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            Tidak ada admin yang ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-navy-900 font-bold uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="p-4">Admin</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Tanggal Dibuat</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-secondary/10 transition">
                    <td className="p-4 font-bold text-navy-900 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-navy-900 text-gold-400 flex items-center justify-center font-bold text-xs">
                        {adm.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{adm.full_name}</span>
                    </td>
                    <td className="p-4 text-navy-900/80">{adm.email}</td>
                    <td className="p-4 font-semibold">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold", adm.role === "SUPER_ADMIN" ? "bg-gold-500/10 text-gold-600 border border-gold-500/20" : "bg-navy-100 text-navy-900")}>
                        {adm.role === "SUPER_ADMIN" ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                        <span>{adm.role}</span>
                      </span>
                    </td>
                    <td className="p-4 font-semibold">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold", adm.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600")}>
                        {adm.status}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(adm.created_at).toLocaleDateString("id-ID")}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => openEdit(adm)}
                        className="rounded-lg p-2 bg-secondary/30 hover:bg-secondary/60 text-navy-900 cursor-pointer"
                        title="Edit Admin"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      {adm.role !== "SUPER_ADMIN" && (
                        <button
                          onClick={() => openDelete(adm)}
                          className="rounded-lg p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 cursor-pointer"
                          title="Hapus Admin"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-navy-900">Buat Akun Admin Baru</h3>
              <button onClick={() => setShowInviteModal(false)} className="cursor-pointer"><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Admin"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border bg-secondary/20 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1">Email Admin *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@openmind2026.id"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full rounded-xl border bg-secondary/20 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1">Kata Sandi *</label>
                <div className="relative">
                  <input
                    type={showFormPassword ? "text" : "password"}
                    required
                    placeholder="Minimal 6 karakter"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full rounded-xl border bg-secondary/20 px-3.5 py-2.5 text-sm pr-10"
                  />
                  <button type="button" onClick={() => setShowFormPassword(!showFormPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer">
                    {showFormPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button type="button" onClick={() => setShowInviteModal(false)} className="px-4 py-2 text-xs font-bold text-muted-foreground cursor-pointer">Batal</button>
                <button type="submit" disabled={isSaving} className="rounded-xl bg-gold-500 px-5 py-2 text-xs font-bold text-navy-955 hover:bg-gold-400 flex items-center gap-2 cursor-pointer disabled:opacity-50">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buat Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-navy-900">Edit Akun Admin</h3>
              <button onClick={() => setShowEditModal(false)} className="cursor-pointer"><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>

            <form onSubmit={handleUpdateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border bg-secondary/20 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1">Status Akun *</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                  className="w-full rounded-xl border bg-secondary/20 px-3.5 py-2.5 text-sm"
                >
                  <option value="ACTIVE">ACTIVE (Aktif)</option>
                  <option value="INACTIVE">INACTIVE (Nonaktif)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1">Ganti Kata Sandi (Opsional)</label>
                <input
                  type="password"
                  placeholder="Kosongkan jika tidak diubah"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full rounded-xl border bg-secondary/20 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-xs font-bold text-muted-foreground cursor-pointer">Batal</button>
                <button type="submit" disabled={isSaving} className="rounded-xl bg-gold-500 px-5 py-2 text-xs font-bold text-navy-955 hover:bg-gold-400 flex items-center gap-2 cursor-pointer disabled:opacity-50">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingAdmin)}
        title="Hapus Akun Admin"
        description={deletingAdmin ? `Apakah Anda yakin ingin menghapus akun admin "${deletingAdmin.full_name}" (${deletingAdmin.email})? Tindakan ini tidak dapat dibatalkan.` : ""}
        confirmLabel="Ya, Hapus Admin"
        onConfirm={handleDeleteAdmin}
        onClose={() => setDeletingAdmin(null)}
      />
    </div>
  );
}
