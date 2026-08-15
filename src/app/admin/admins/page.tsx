"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users, Plus, Edit, Trash2, Shield, ShieldCheck,
  Search, X, Eye, EyeOff, Mail, Lock, CalendarDays,
  Check, AlertCircle, UserCog, Filter, ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AdminRole = "Super Admin" | "Admin";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: AdminRole;
  lastLogin: string;
  createdAt: string;
  isActive: boolean;
}

const STORAGE_KEY = "open_mind_admins_2026";

const defaultAdmins: AdminUser[] = [
  { id: "adm-1", name: "Super Admin", email: "superadmin@openmind2026.id", password: "password123", role: "Super Admin", lastLogin: "2026-08-15 10:00", createdAt: "2026-07-01", isActive: true },
  { id: "adm-2", name: "Event Manager", email: "event@openmind2026.id", password: "password123", role: "Admin", lastLogin: "2026-08-15 09:30", createdAt: "2026-07-15", isActive: true },
  { id: "adm-3", name: "Ticket PIC", email: "ticket@openmind2026.id", password: "password123", role: "Admin", lastLogin: "2026-08-14 18:00", createdAt: "2026-07-20", isActive: true },
];

function getStoredAdmins(): AdminUser[] {
  if (typeof window === "undefined") return defaultAdmins;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultAdmins)); return defaultAdmins; }
    return JSON.parse(raw);
  } catch { return defaultAdmins; }
}

function saveAdmins(admins: AdminUser[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(admins));
}

function generateId(): string {
  return `adm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const avatarColors = [
  "bg-gold-500 text-navy-950", "bg-navy-900 text-ivory-100",
  "bg-emerald-600 text-white", "bg-orange-500 text-white",
  "bg-burgundy-600 text-ivory-100", "bg-navy-700 text-gold-400",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-navy-950 px-5 py-3 text-xs font-bold text-ivory-100 shadow-2xl border border-gold-500/30 flex items-center gap-2">
      <Check className="h-4 w-4 text-emerald-400" />
      <span>{message}</span>
    </div>
  );
}

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<AdminUser[]>(() => getStoredAdmins());
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AdminRole>("all");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUser | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const showToast = useCallback((msg: string) => { setToastMsg(msg); }, []);

  const totalAdmins = admins.length;
  const superAdmins = admins.filter((a) => a.role === "Super Admin").length;
  const regularAdmins = admins.filter((a) => a.role === "Admin").length;

  const filteredAdmins = admins.filter((admin) => {
    const matchesSearch =
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || admin.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  function validateForm(isEdit: boolean): boolean {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = "Nama wajib diisi";
    if (!formEmail.trim()) {
      errors.email = "Email wajib diisi";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)) {
      errors.email = "Format email tidak valid";
    } else if (!isEdit) {
      const exists = admins.some((a) => a.email.toLowerCase() === formEmail.toLowerCase());
      if (exists) errors.email = "Email sudah terdaftar";
    }
    if (!isEdit && !formPassword) {
      errors.password = "Password wajib diisi";
    } else if (!isEdit && formPassword.length < 6) {
      errors.password = "Password minimal 6 karakter";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function resetForm() {
    setFormName(""); setFormEmail(""); setFormPassword(""); setShowFormPassword(false); setFormErrors({});
  }

  function handleInvite() { resetForm(); setShowInviteModal(true); }

  function handleEdit(admin: AdminUser) {
    setEditingAdmin(admin); setFormName(admin.name); setFormEmail(admin.email);
    setFormPassword(""); setShowFormPassword(false);
    setFormErrors({}); setShowEditModal(true);
  }

  function handleDelete(admin: AdminUser) { setDeletingAdmin(admin); setShowDeleteModal(true); }

  function submitInvite() {
    if (!validateForm(false)) return;
    setIsSaving(true);
    setTimeout(() => {
      const newAdmin: AdminUser = {
        id: generateId(), name: formName.trim(), email: formEmail.trim().toLowerCase(),
        password: formPassword, role: "Admin", lastLogin: "-",
        createdAt: new Date().toISOString().split("T")[0], isActive: true,
      };
      const updated = [...admins, newAdmin];
      saveAdmins(updated); setAdmins(updated); setIsSaving(false);
      setShowInviteModal(false); resetForm();
      showToast(`Admin "${newAdmin.name}" berhasil ditambahkan.`);
    }, 500);
  }

  function submitEdit() {
    if (!validateForm(true) || !editingAdmin) return;
    setIsSaving(true);
    setTimeout(() => {
      const updated = admins.map((a) =>
        a.id === editingAdmin.id
          ? { ...a, name: formName.trim(), email: formEmail.trim().toLowerCase(), ...(formPassword ? { password: formPassword } : {}) }
          : a
      );
      saveAdmins(updated); setAdmins(updated); setIsSaving(false);
      setShowEditModal(false); setEditingAdmin(null); resetForm();
      showToast(`Admin "${formName.trim()}" berhasil diperbarui.`);
    }, 500);
  }

  function submitDelete() {
    if (!deletingAdmin) return;
    const updated = admins.filter((a) => a.id !== deletingAdmin.id);
    saveAdmins(updated); setAdmins(updated); setShowDeleteModal(false);
    showToast(`Admin "${deletingAdmin.name}" berhasil dihapus.`);
    setDeletingAdmin(null);
  }

  return (
    <div className="space-y-6">
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-600 mb-2 border border-gold-500/20">
            <UserCog className="h-3 w-3" /><span>SUPER ADMIN / ADMIN MANAGEMENT</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">Manajemen Akun Admin</h1>
          <p className="text-xs sm:text-sm text-navy-900/70 mt-1">Kelola akun panitia, atur role akses, dan undang admin baru untuk panel operasional.</p>
        </div>
        <button type="button" onClick={handleInvite} className="inline-flex items-center gap-2 rounded-2xl bg-gold-500 px-6 py-3.5 text-xs sm:text-sm font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-md active:scale-95 self-start sm:self-auto">
          <Plus className="h-4 w-4" /><span>Invite Admin</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard label="TOTAL ADMIN" value={totalAdmins} icon={<Users className="h-5 w-5" />} iconBg="bg-navy-900/5 text-navy-900" footer="Akun terdaftar di sistem" />
        <StatCard label="SUPER ADMIN" value={superAdmins} icon={<ShieldCheck className="h-5 w-5" />} iconBg="bg-gold-500/10 text-gold-600" footer="Akses penuh ke seluruh fitur" />
        <StatCard label="REGULAR ADMIN" value={regularAdmins} icon={<Shield className="h-5 w-5" />} iconBg="bg-emerald-500/10 text-emerald-600" footer="Akses terbatas (operasional)" />
      </div>

      <div className="rounded-3xl border border-border bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Cari berdasarkan nama atau email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 pl-10 pr-4 text-xs font-medium text-navy-900 placeholder:text-muted-foreground focus:border-gold-500 focus:bg-white focus:outline-none transition-colors" />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            {(["all", "Super Admin", "Admin"] as const).map((role) => (
              <button key={role} type="button" onClick={() => setRoleFilter(role)} className={cn("rounded-xl px-3.5 py-2 text-[11px] font-bold transition-all whitespace-nowrap", roleFilter === role ? "bg-navy-900 text-gold-400 shadow-sm" : "bg-secondary/50 text-navy-900/60 hover:bg-secondary hover:text-navy-900")}>
                {role === "all" ? "Semua" : role}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="font-display text-xl font-bold text-navy-900">Daftar Akun Admin</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{filteredAdmins.length} dari {admins.length} akun ditampilkan</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 text-navy-900 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5 rounded-l-xl"><span className="flex items-center gap-1">User<ArrowUpDown className="h-3 w-3" /></span></th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Terakhir Login</th>
                <th className="px-4 py-3.5 text-right rounded-r-xl">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-navy-900/20" />
                      <span className="text-xs font-semibold">Tidak ada admin ditemukan</span>
                      <span className="text-[10px]">Coba ubah filter atau kata kunci pencarian</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold flex-shrink-0", getAvatarColor(admin.name))}>
                          {getInitials(admin.name)}
                        </div>
                        <div>
                          <span className="font-semibold text-navy-900 block text-sm">{admin.name}</span>
                          <span className="text-[10px] text-muted-foreground">{admin.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase", admin.role === "Super Admin" ? "bg-gold-500/15 text-gold-600 border border-gold-500/20" : "bg-emerald-500/15 text-emerald-700 border border-emerald-500/20")}>
                        {admin.role === "Super Admin" ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}{admin.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-emerald-700">Aktif</span>
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3" />{admin.lastLogin}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" onClick={() => handleEdit(admin)} className="inline-flex items-center gap-1 rounded-xl bg-navy-900 px-3 py-1.5 text-[10px] font-semibold text-ivory-100 hover:bg-gold-500 hover:text-navy-950 transition-all shadow-sm" title="Edit admin">
                          <Edit className="h-3 w-3" /><span>Edit</span>
                        </button>
                        <button type="button" onClick={() => handleDelete(admin)} disabled={admin.role === "Super Admin"} className={cn("inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-semibold transition-all shadow-sm", admin.role === "Super Admin" ? "bg-secondary/50 text-muted-foreground/50 cursor-not-allowed" : "bg-destructive/10 text-destructive hover:bg-destructive hover:text-white")} title={admin.role === "Super Admin" ? "Super Admin tidak dapat dihapus" : "Hapus admin"}>
                          <Trash2 className="h-3 w-3" /><span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal — NO role selector, always ADMIN */}
      {showInviteModal && (
        <ModalBackdrop onClose={() => setShowInviteModal(false)}>
          <div className="w-full max-w-lg rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">INVITE ADMIN BARU</span>
                <h3 className="font-display text-xl font-bold text-navy-900">Tambah Akun Admin</h3>
              </div>
              <button type="button" onClick={() => { setShowInviteModal(false); resetForm(); }} className="rounded-full p-2 text-muted-foreground hover:bg-secondary transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <FormField label="Nama Lengkap" value={formName} onChange={setFormName} placeholder="Contoh: Ahmad Rizky" error={formErrors.name} />
              <FormField label="Alamat Email" value={formEmail} onChange={setFormEmail} placeholder="ahmad@openmind2026.id" type="email" icon={<Mail className="h-3.5 w-3.5" />} error={formErrors.email} />
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">Kata Sandi</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input type={showFormPassword ? "text" : "password"} value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Minimal 6 karakter" className={cn("w-full rounded-xl border bg-secondary/20 py-3 pl-10 pr-10 text-xs font-medium text-navy-900 placeholder:text-muted-foreground focus:border-gold-500 focus:bg-white focus:outline-none transition-colors", formErrors.password ? "border-destructive" : "border-border")} />
                  <button type="button" onClick={() => setShowFormPassword(!showFormPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy-900">
                    {showFormPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {formErrors.password && <p className="text-[10px] text-destructive mt-1 font-medium">{formErrors.password}</p>}
              </div>
              {/* Role indicator — fixed to Admin, no selector */}
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-bold text-emerald-700 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Role: Admin (Akses Operasional)</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button type="button" onClick={() => { setShowInviteModal(false); resetForm(); }} className="px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-navy-900 rounded-xl hover:bg-secondary transition-colors">Batal</button>
              <button type="button" onClick={submitInvite} disabled={isSaving} className="inline-flex items-center gap-2 rounded-2xl bg-gold-500 px-6 py-3 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-md disabled:opacity-50 active:scale-95">
                {isSaving ? <><span className="animate-spin h-3.5 w-3.5 border-2 border-navy-950/30 border-t-navy-950 rounded-full" /><span>Menyimpan...</span></> : <><Plus className="h-3.5 w-3.5" /><span>Invite Admin</span></>}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* Edit Modal — role read-only, cannot change to Super Admin */}
      {showEditModal && editingAdmin && (
        <ModalBackdrop onClose={() => { setShowEditModal(false); setEditingAdmin(null); resetForm(); }}>
          <div className="w-full max-w-lg rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">EDIT AKUN ADMIN</span>
                <h3 className="font-display text-xl font-bold text-navy-900">{editingAdmin.name}</h3>
              </div>
              <button type="button" onClick={() => { setShowEditModal(false); setEditingAdmin(null); resetForm(); }} className="rounded-full p-2 text-muted-foreground hover:bg-secondary transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <FormField label="Nama Lengkap" value={formName} onChange={setFormName} placeholder="Nama admin" error={formErrors.name} />
              <FormField label="Alamat Email" value={formEmail} onChange={setFormEmail} placeholder="email@openmind2026.id" type="email" icon={<Mail className="h-3.5 w-3.5" />} error={formErrors.email} />
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">Kata Sandi Baru <span className="text-muted-foreground font-normal normal-case">(biarkan kosong jika tidak diubah)</span></label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input type={showFormPassword ? "text" : "password"} value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Minimal 6 karakter" className={cn("w-full rounded-xl border bg-secondary/20 py-3 pl-10 pr-10 text-xs font-medium text-navy-900 placeholder:text-muted-foreground focus:border-gold-500 focus:bg-white focus:outline-none transition-colors", formErrors.password ? "border-destructive" : "border-border")} />
                  <button type="button" onClick={() => setShowFormPassword(!showFormPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy-900">
                    {showFormPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {formErrors.password && <p className="text-[10px] text-destructive mt-1 font-medium">{formErrors.password}</p>}
              </div>
              {/* Role display — read-only, cannot change */}
              <div className="rounded-xl bg-secondary/30 p-3 text-xs font-bold text-navy-900 flex items-center gap-2">
                {editingAdmin.role === "Super Admin" ? <ShieldCheck className="h-4 w-4 text-gold-600" /> : <Shield className="h-4 w-4 text-emerald-600" />}
                <span>Role: {editingAdmin.role} <span className="text-muted-foreground font-normal normal-case">(tidak dapat diubah)</span></span>
              </div>
              <div className="rounded-xl bg-secondary/30 p-3 text-[10px] text-muted-foreground flex items-center gap-2">
                <CalendarDays className="h-3 w-3" />
                <span>Dibuat: {editingAdmin.createdAt} • Terakhir login: {editingAdmin.lastLogin}</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button type="button" onClick={() => { setShowEditModal(false); setEditingAdmin(null); resetForm(); }} className="px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-navy-900 rounded-xl hover:bg-secondary transition-colors">Batal</button>
              <button type="button" onClick={submitEdit} disabled={isSaving} className="inline-flex items-center gap-2 rounded-2xl bg-gold-500 px-6 py-3 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-md disabled:opacity-50 active:scale-95">
                {isSaving ? <><span className="animate-spin h-3.5 w-3.5 border-2 border-navy-950/30 border-t-navy-950 rounded-full" /><span>Menyimpan...</span></> : <><Check className="h-3.5 w-3.5" /><span>Simpan Perubahan</span></>}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {showDeleteModal && deletingAdmin && (
        <ModalBackdrop onClose={() => { setShowDeleteModal(false); setDeletingAdmin(null); }}>
          <div className="w-full max-w-md rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10"><AlertCircle className="h-8 w-8 text-destructive" /></div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-display text-xl font-bold text-navy-900">Hapus Akun Admin?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Anda akan menghapus akun <strong className="text-navy-900">{deletingAdmin.name}</strong> ({deletingAdmin.email}) dari sistem. Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <div className="flex items-center justify-center gap-1.5 rounded-xl bg-destructive/10 p-3 text-[10px] font-bold text-destructive border border-destructive/20">
              <AlertCircle className="h-3 w-3" /><span>Admin yang dihapus tidak akan bisa mengakses panel lagi.</span>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button type="button" onClick={() => { setShowDeleteModal(false); setDeletingAdmin(null); }} className="flex-1 rounded-2xl border border-border px-5 py-3 text-xs font-bold text-navy-900 hover:bg-secondary transition-colors">Batal</button>
              <button type="button" onClick={submitDelete} className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-destructive px-5 py-3 text-xs font-bold text-white hover:bg-destructive/90 transition-all shadow-md active:scale-95">
                <Trash2 className="h-3.5 w-3.5" /><span>Hapus Admin</span>
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, iconBg, footer }: { label: string; value: number; icon: React.ReactNode; iconBg: string; footer: string }) {
  return (
    <div className="rounded-3xl border border-border bg-white p-6 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", iconBg)}>{icon}</div>
      </div>
      <p className="font-display text-3xl font-black text-navy-900">{value}</p>
      <div className="text-[11px] text-muted-foreground">{footer}</div>
    </div>
  );
}

function ModalBackdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = "text", icon, error }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; icon?: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn("w-full rounded-xl border bg-secondary/20 py-3 text-xs font-medium text-navy-900 placeholder:text-muted-foreground focus:border-gold-500 focus:bg-white focus:outline-none transition-colors", icon ? "pl-10 pr-4" : "px-4", error ? "border-destructive" : "border-border")} />
      </div>
      {error && <p className="text-[10px] text-destructive mt-1 font-medium">{error}</p>}
    </div>
  );
}
