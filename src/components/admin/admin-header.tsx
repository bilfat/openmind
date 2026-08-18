"use client";

import { usePathname } from "next/navigation";
import { Search, User, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { NotificationDropdown } from "@/components/admin/notification-dropdown";

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
  "/admin/notifications": "Notifications",
};

interface AdminHeaderProps {
  onMenuToggle?: () => void;
}

export function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState("Admin");
  const [displayRole, setDisplayRole] = useState("Admin");
  const supabase = createClient();

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (profile) {
        setDisplayName(profile.full_name || user.email?.split("@")[0] || "Admin");
        setDisplayRole(profile.role === "SUPER_ADMIN" ? "Super Admin" : "Admin");
      }
    }
    fetchUserData();
  }, [supabase]);

  const getTitle = () => {
    for (const [path, title] of Object.entries(pageTitles)) {
      if (pathname.startsWith(path)) return title;
    }
    return "Admin";
  };

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

          <NotificationDropdown />

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
