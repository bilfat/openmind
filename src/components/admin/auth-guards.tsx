"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

export function AccessDenied({ fallbackHref = "/admin/dashboard" }: { fallbackHref?: string }) {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-2xl border border-burgundy-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-burgundy-600">403</p>
        <h2 className="mt-2 text-2xl font-bold text-navy-900">ACCESS DENIED</h2>
        <p className="mt-3 text-sm text-muted-foreground">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        <button
          onClick={() => router.push(fallbackHref)}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-xs font-bold text-ivory-100 transition-all hover:bg-gold-500 hover:text-navy-950"
        >
          <LogIn className="h-3.5 w-3.5" />
          <span>Kembali ke halaman utama</span>
        </button>
      </div>
    </div>
  );
}

export function SessionExpired() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-6 text-center text-ivory-100">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-400">Session</p>
        <h1 className="mt-2 text-3xl font-bold">SESSION EXPIRED</h1>
        <p className="mt-3 text-sm text-ivory-200/70">Silakan login kembali untuk melanjutkan.</p>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/admin/login?returnTo=${encodeURIComponent(pathname)}`);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", user.id)
        .single();

      if (!profile || profile.status !== "ACTIVE") {
        await supabase.auth.signOut();
        router.replace(`/admin/login?returnTo=${encodeURIComponent(pathname)}`);
        return;
      }

      setLoading(false);
    }

    checkAuth();
  }, [pathname, router, supabase]);

  if (loading) return <div className="min-h-screen bg-[#F5F3EE]" aria-label="Loading session" />;
  return <>{children}</>;
}

const SUPER_ADMIN_ROUTES = [
  "/admin/tickets",
  "/admin/referrals",
  "/admin/admins",
  "/admin/event",
  "/admin/settings",
];

const STAFF_ROUTES = ["/admin/walk-in", "/admin/check-in"];

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile) {
        setRole(profile.role);
      }
      setLoading(false);
    }

    fetchRole();
  }, [supabase]);

  const requiresSuperAdmin = SUPER_ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isStaffRoute = STAFF_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (loading) return <div className="min-h-screen bg-[#F5F3EE]" aria-label="Checking permissions" />;
  if (role === "STAFF") {
    if (!isStaffRoute) return <AccessDenied fallbackHref="/admin/walk-in" />;
  } else if (requiresSuperAdmin && role !== "SUPER_ADMIN") {
    return <AccessDenied />;
  }
  return <>{children}</>;
}
