"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Harap isi alamat email dan kata sandi.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setIsLoading(false);
        setError(authError.message || "Kredensial tidak valid.");
        return;
      }

      const user = data.user;
      if (!user) {
        setIsLoading(false);
        setError("Gagal memproses sesi login.");
        return;
      }

      // Check profile status from profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setIsLoading(false);
        setError("Profil admin tidak ditemukan di database.");
        return;
      }

      if (profile.status !== "ACTIVE") {
        await supabase.auth.signOut();
        setIsLoading(false);
        setError("Akun ini tidak aktif. Silakan hubungi Super Admin.");
        return;
      }

      // Fetch role to pick the right landing page (staff only has walk-in & check-in)
      const { data: roleProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = roleProfile?.role ?? "ADMIN";

      const returnTo = new URLSearchParams(window.location.search).get("returnTo") || "";
      const returnToAllowed =
        returnTo.startsWith("/admin/") &&
        (role === "STAFF"
          ? returnTo === "/admin/walk-in" ||
            returnTo === "/admin/check-in" ||
            returnTo.startsWith("/admin/walk-in/") ||
            returnTo.startsWith("/admin/check-in/")
          : true);

      const target = returnToAllowed
        ? returnTo
        : role === "STAFF"
          ? "/admin/walk-in"
          : "/admin/dashboard";

      // Redirect on successful login
      router.push(target);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || "Terjadi kesalahan sistem.");
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Back Link */}
      <div className="absolute top-6 left-6 z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ivory-200/70 hover:text-gold-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Website Utama</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/10 px-3.5 py-1 text-xs font-bold text-gold-400 uppercase tracking-widest border border-gold-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>PANITIA PORTAL</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-ivory-100 tracking-wider">
            OPEN MIND <span className="text-gold-400">2026</span>
          </h2>
          <p className="text-xs sm:text-sm text-ivory-200/70">
            Masuk ke panel manajemen acara & verifikasi tiket
          </p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-8 rounded-3xl border border-gold-500/30 bg-navy-900/90 p-8 shadow-2xl backdrop-blur-xl space-y-6"
        >
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ivory-200/80 mb-1.5">
                Alamat Email Admin
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold-400/70" />
                <input
                  type="email"
                  placeholder="admin@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-navy-700 bg-navy-950/80 py-3 pl-10 pr-4 text-sm text-ivory-100 placeholder:text-ivory-200/40 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ivory-200/80 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold-400/70" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-navy-700 bg-navy-950/80 py-3 pl-10 pr-10 text-sm text-ivory-100 placeholder:text-ivory-200/40 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ivory-200/50 hover:text-ivory-100"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/20 border border-destructive/30 p-3 text-xs text-destructive text-center">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-500 py-3.5 text-sm font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20 hover:scale-[1.01] active:scale-95 disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span>Memverifikasi Akses...</span>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
