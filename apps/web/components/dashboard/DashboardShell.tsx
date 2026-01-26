"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileSidebar } from "./MobileSidebar";
import { NotificationProvider } from "@/components/notifications";

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    role: string;
  };
  restaurantSlug: string;
  restaurantName: string;
  allowedPages?: string[];
}

export function DashboardShell({
  children,
  user,
  restaurantSlug,
  restaurantName,
  allowedPages,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <NotificationProvider userRole={user.role}>
      {/* Mobile sidebar */}
      <MobileSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        restaurantSlug={restaurantSlug}
        userRole={user.role}
        allowedPages={allowedPages}
      />

      {/* Desktop sidebar */}
      <Sidebar restaurantSlug={restaurantSlug} userRole={user.role} allowedPages={allowedPages} />

      {/* Main content */}
      <div className="lg:pl-64">
        <Header
          user={user}
          restaurantName={restaurantName}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </NotificationProvider>
  );
}
