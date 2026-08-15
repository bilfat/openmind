"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, User, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { getSession, AuthUser } from "@/lib/auth";

const pageTitles: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/orders": "Order Management",
  "/admin/participants": "Participants",
  "/admin/check-in": "Check-in",
  "/admin/tickets": "Ticket Management",
  "/admin/referrals": "Referral Management",
  "/admin/admins": "Admin Management",
  "/admin/event": "Event Settings",
  "/admin/settings": "System Settings",
};

interface AdminHeaderProps {
  onMenuToggle?: () => void;
}

export function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const session = getSession();
    setUser(session);
  }, []);

  const getTitle = () => {
    for (const [path, title] of Object.entries(pageTitles)) {
      if (pathname.startsWith(path)) return title;
    }
    return "Admin";
  };

  const displayName = user?.name || "Admin";
  const displayRole = user?.role === "SUPER_ADMIN" ? "Super Admin" : "Admin";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/80 backdrop-blur-lg">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:h-20">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            onClick={onMenuToggle}
            className="rounded-lg p-2 text-navy-900/50 hover:text-navy-900 hover:bg-muted transition-colors lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="text-base sm:text-lg font-semibold text-navy-900">{getTitle()}</h1>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            className="rounded-lg p-2 text-navy-900/50 hover:text-navy-900 hover:bg-muted transition-colors"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          <button
            className="relative rounded-lg p-2 text-navy-900/50 hover:text-navy-900 hover:bg-muted transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-500" />
          </button>

          <div className="mx-1 h-8 w-px bg-border hidden sm:block" />

          <button className="flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-1.5 hover:bg-muted transition-colors">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-500/10 text-gold-500">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-navy-900">{displayName}</p>
              <p className="text-xs text-muted-foreground">{displayRole}</p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
