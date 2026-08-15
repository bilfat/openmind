"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthUser, getSession } from "@/lib/auth";
import { LogIn } from "lucide-react";

export function AccessDenied() {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-2xl border border-burgundy-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-burgundy-600">403</p>
        <h2 className="mt-2 text-2xl font-bold text-navy-900">ACCESS DENIED</h2>
        <p className="mt-3 text-sm text-muted-foreground">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-xs font-bold text-ivory-100 transition-all hover:bg-gold-500 hover:text-navy-950"
        >
          <LogIn className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session || session.status !== "ACTIVE") {
      router.replace(`/admin/login?returnTo=${encodeURIComponent(pathname)}`);
      return;
    }
    setUser(session);
    setChecked(true);
  }, [pathname, router]);

  if (!checked || !user) return <div className="min-h-screen bg-[#F5F3EE]" aria-label="Loading session" />;
  return <>{children}</>;
}

const SUPER_ADMIN_ROUTES = [
  "/admin/tickets",
  "/admin/referrals",
  "/admin/admins",
  "/admin/event",
  "/admin/settings",
];

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = getSession();
  const requiresSuperAdmin = SUPER_ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (requiresSuperAdmin && user?.role !== "SUPER_ADMIN") return <AccessDenied />;
  return <>{children}</>;
}
