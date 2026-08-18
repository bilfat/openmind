"use client";

import { usePathname } from "next/navigation";
import { AuthGuard, RoleGuard } from "@/components/admin/auth-guards";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { useState } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { NotificationProvider } from "@/components/admin/notification-provider";
import { ActiveEventProvider } from "@/hooks/use-active-event";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoginPage) {
    return <div className="min-h-screen bg-navy-950">{children}</div>;
  }

  return (
    <AuthGuard>
      <RoleGuard>
        <ActiveEventProvider>
          <ToastProvider>
            <NotificationProvider>
              <div className="flex min-h-screen bg-[#F5F3EE]">
                {/* Sidebar — hidden on mobile, overlay when toggled */}
                <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

                <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
                  <AdminHeader onMenuToggle={() => setMobileOpen(!mobileOpen)} />
                  <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
                    {children}
                  </main>
                </div>
              </div>
            </NotificationProvider>
          </ToastProvider>
        </ActiveEventProvider>
      </RoleGuard>
    </AuthGuard>
  );
}
