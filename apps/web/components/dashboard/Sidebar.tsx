"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { canAccessPage, type PageAccess } from "@/lib/permissions";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  Users,
  QrCode,
  Settings,
  BarChart3,
  Menu,
  ChefHat,
  Receipt,
  Eye,
  UserCircle,
  Crown,
  Headphones,
  Heart,
  Tag,
  MessageSquare,
  FileText,
  Megaphone,
  Package,
  LucideIcon,
  Wine,
  CalendarDays,
  Bell,
  Zap,
} from "lucide-react";

interface SidebarProps {
  restaurantSlug: string;
  userRole?: string;
  allowedPages?: string[];
}

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  page: PageAccess;
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, page: "dashboard" },
  { name: "Menu", href: "/menu", icon: UtensilsCrossed, page: "menu" },
  { name: "Orders", href: "/orders", icon: ClipboardList, page: "orders" },
  { name: "Quick Order", href: "/quick-order", icon: Zap, page: "quick-order" },
  { name: "Kitchen", href: "/kitchen", icon: ChefHat, page: "kitchen" },
  { name: "Bar", href: "/bar", icon: Wine, page: "bar" },
  { name: "Billing", href: "/billing", icon: Receipt, page: "billing" },
  { name: "Tables", href: "/tables", icon: QrCode, page: "tables" },
  { name: "Reservations", href: "/reservations", icon: CalendarDays, page: "reservations" },
  { name: "Assistance", href: "/assistance", icon: Bell, page: "assistance" },
  { name: "Staff", href: "/staff", icon: Users, page: "staff" },
  { name: "Customers", href: "/customers", icon: Heart, page: "customers" },
  { name: "Promotions", href: "/promotions", icon: Tag, page: "promotions" },
  { name: "Chat", href: "/chat", icon: MessageSquare, page: "chat" },
  { name: "Shift Notes", href: "/shift-notes", icon: FileText, page: "shift-notes" },
  { name: "Briefing", href: "/briefing", icon: Megaphone, page: "briefing" },
  { name: "Lost & Found", href: "/lost-found", icon: Package, page: "lost-found" },
  { name: "Reports", href: "/reports", icon: BarChart3, page: "reports" },
  { name: "Settings", href: "/settings", icon: Settings, page: "settings" },
];

export function Sidebar({ restaurantSlug, userRole = "OWNER", allowedPages }: SidebarProps) {
  const pathname = usePathname();

  // Filter navigation based on allowed pages (from database) or fallback to role-based
  const filteredNavigation = useMemo(() => {
    if (allowedPages && allowedPages.length > 0) {
      return navigation.filter((item) => allowedPages.includes(item.page));
    }
    // Fallback to role-based access
    return navigation.filter((item) => canAccessPage(userRole, item.page));
  }, [userRole, allowedPages]);

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-card px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center">
          <Link href={`/${restaurantSlug}/dashboard`} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Menu className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">QR Dine</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {filteredNavigation.map((item) => {
                  const href = `/${restaurantSlug}${item.href}`;
                  const isActive = pathname === href || pathname.startsWith(`${href}/`);

                  return (
                    <li key={item.name}>
                      <Link
                        href={href}
                        className={cn(
                          "group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>

            {/* Demo Preview Section - Remove on Deployment */}
            <li className="mt-auto">
              <DemoPreviewSection restaurantSlug={restaurantSlug} />
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  );
}

// Demo Preview Section Component
function DemoPreviewSection({ restaurantSlug }: { restaurantSlug: string }) {
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  useEffect(() => {
    // Read demo_role_override cookie
    const cookies = document.cookie.split(";");
    const demoRoleCookie = cookies.find((c) => c.trim().startsWith("demo_role_override="));
    if (demoRoleCookie) {
      setCurrentRole(demoRoleCookie.split("=")[1] ?? null);
    }
  }, []);

  const roles = [
    { role: "owner", label: "Owner", icon: Crown, color: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
    { role: "manager", label: "Manager", icon: Crown, color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
    { role: "waiter", label: "Waiter", icon: UserCircle, color: "bg-green-100 text-green-700 hover:bg-green-200" },
    { role: "kitchen", label: "Kitchen", icon: ChefHat, color: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
    { role: "host", label: "Host", icon: Headphones, color: "bg-pink-100 text-pink-700 hover:bg-pink-200" },
  ];

  const openInNewTab = (role: string) => {
    window.open(`/${restaurantSlug}/demo/${role}`, "_blank");
  };

  return (
    <div className="border-t pt-4">
      <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <Eye className="h-3 w-3" />
        Demo Preview
      </p>
      {currentRole && (
        <p className="px-2 text-[10px] text-amber-600 font-medium mb-1">
          Current: {currentRole}
        </p>
      )}
      <p className="px-2 text-[10px] text-muted-foreground mb-2">
        Open each role in new tab
      </p>
      <div className="space-y-1 -mx-2">
        {roles.map(({ role, label, icon: Icon, color }) => (
          <button
            key={role}
            onClick={() => openInNewTab(role)}
            className={cn(
              "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              color
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            <span className="ml-auto text-[10px] opacity-60">↗</span>
          </button>
        ))}
      </div>
    </div>
  );
}
