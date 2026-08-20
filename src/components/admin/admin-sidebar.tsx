"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  ScanLine,
  Ticket,
  Tag,
  CalendarDays,
  UserCog,
  Settings,
  LogOut,
  ChevronLeft,
  X,
  Bell,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/browser";
import { useNotifications } from "@/components/admin/notification-provider";
import { UnreadBadge } from "@/components/admin/notification-shared";

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  superAdminOnly?: boolean;
  staffOnly?: boolean;
}

const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
      { label: "Participants", href: "/admin/participants", icon: Users },
      { label: "Walk-In Sales", href: "/admin/walk-in", icon: ShoppingCart, staffOnly: true },
      { label: "Check-in", href: "/admin/check-in", icon: ScanLine, staffOnly: true },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Tickets", href: "/admin/tickets", icon: Ticket, superAdminOnly: true },
      { label: "Referrals", href: "/admin/referrals", icon: Tag, superAdminOnly: true },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Admin Management", href: "/admin/admins", icon: UserCog, superAdminOnly: true },
      { label: "Event Settings", href: "/admin/event", icon: CalendarDays, superAdminOnly: true },
      { label: "System Settings", href: "/admin/settings", icon: Settings, superAdminOnly: true },
    ],
  },
];

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AdminSidebar({ mobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const { unreadCount } = useNotifications();
  const supabase = createClient();

  useEffect(() => {
    async function fetchUserRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile) {
        setRole(profile.role);
      }
    }
    fetchUserRole();
  }, [supabase]);

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") return pathname === "/admin/dashboard" || pathname === "/admin";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  // Filter groups and items based on role:
  // - STAFF: only walk-in & check-in (staffOnly items)
  // - ADMIN: all non-super-admin items
  // - SUPER_ADMIN: everything
  const isStaff = role === "STAFF";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (isStaff) return !!item.staffOnly;
        if (item.superAdminOnly) return isSuperAdmin;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-navy-700/50 px-4 lg:h-20">
        {!collapsed && (
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <img
              src="/logo-om.jpg"
              alt="OPEN MIND"
              className="h-8 w-8 rounded-md object-cover"
            />
            <span className="font-display text-lg font-bold tracking-wider text-ivory-100">
              OPEN MIND
            </span>
            <span className="text-[9px] font-semibold tracking-widest text-gold-500 uppercase">
              Admin
            </span>
          </Link>
        )}

        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="rounded-lg p-1.5 text-ivory-200/40 hover:text-ivory-100 hover:bg-navy-800 transition-colors lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 text-ivory-200/40 hover:text-ivory-100 hover:bg-navy-800 transition-colors hidden lg:block"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-ivory-200/30">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-navy-800 text-gold-500 border-l-2 border-gold-500 -ml-px"
                        : "text-ivory-200/50 hover:text-ivory-100 hover:bg-navy-800/60",
                      collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={cn("h-[18px] w-[18px] flex-shrink-0", active && "text-gold-500")} />
                    {!collapsed && <span>{item.label}</span>}
                    {item.href === "/admin/notifications" && (
                      <UnreadBadge
                        count={unreadCount}
                        className={cn("ml-auto", collapsed && "hidden")}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — Logout */}
      <div className="border-t border-navy-700/50 p-3">
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ivory-200/50 hover:text-burgundy-600 hover:bg-navy-800/60 transition-all",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar — fixed on desktop, slide-in on mobile */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-navy-900 transition-all duration-300",
          // Desktop
          "hidden lg:flex",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-navy-900 transition-transform duration-300 lg:hidden w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
