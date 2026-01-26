"use client";

import { useRouter } from "next/navigation";
import { Button, Avatar } from "@qr-dine/ui";
import { LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { NotificationBell } from "@/components/notifications";

interface HeaderProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  restaurantName: string;
  onMenuClick?: () => void;
}

export function Header({ user, restaurantName, onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-card px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-muted-foreground lg:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-border lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Restaurant name */}
        <div className="flex flex-1 items-center">
          <h2 className="text-lg font-semibold">{restaurantName}</h2>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Notifications */}
          <NotificationBell />

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" />

          {/* User menu */}
          <div className="flex items-center gap-x-4">
            <Avatar
              alt={user.name}
              fallback={initials}
              size="sm"
            />
            <div className="hidden lg:block">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role.toLowerCase()}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">
                {isLoggingOut ? "Logging out..." : "Logout"}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
