"use client";

import { Shield, Settings } from "lucide-react";

export default function SystemSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-600 mb-2 border border-gold-500/20">
          <Settings className="h-3 w-3" /><span>SUPER ADMIN / SYSTEM SETTINGS</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">System Settings</h1>
        <p className="text-xs sm:text-sm text-navy-900/70 mt-1">Konfigurasi sistem, pengaturan global, dan manajemen teknis aplikasi.</p>
      </div>

      <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-500/10 mb-4">
            <Settings className="h-8 w-8 text-gold-600" />
          </div>
          <h3 className="font-display text-xl font-bold text-navy-900 mb-2">Pengaturan Sistem</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Halaman ini akan berisi konfigurasi sistem seperti pengaturan website, email, backup, dan manajemen teknis lainnya.
          </p>
          <div className="mt-6 flex items-center gap-1.5 rounded-full bg-gold-500/10 px-4 py-2 text-xs font-bold text-gold-600 border border-gold-500/20">
            <Shield className="h-3 w-3" />
            <span>Akses Super Admin Saja</span>
          </div>
        </div>
      </div>
    </div>
  );
}