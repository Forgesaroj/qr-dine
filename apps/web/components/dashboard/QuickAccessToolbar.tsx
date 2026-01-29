"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  UtensilsCrossed,
  ChefHat,
  Receipt,
  Grid3X3,
  ClipboardList,
} from "lucide-react";

interface QuickAccessToolbarProps {
  restaurantSlug: string;
}

const quickAccessItems = [
  {
    id: "quick-order",
    label: "Quick Order",
    icon: UtensilsCrossed,
    path: "quick-order",
    color: "text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200",
    activeColor: "bg-blue-600 text-white border-blue-600",
  },
  {
    id: "orders",
    label: "Orders",
    icon: ClipboardList,
    path: "orders",
    color: "text-yellow-600 bg-yellow-50 hover:bg-yellow-100 border-yellow-200",
    activeColor: "bg-yellow-600 text-white border-yellow-600",
  },
  {
    id: "kitchen",
    label: "Kitchen",
    icon: ChefHat,
    path: "kitchen",
    color: "text-orange-600 bg-orange-50 hover:bg-orange-100 border-orange-200",
    activeColor: "bg-orange-600 text-white border-orange-600",
  },
  {
    id: "billing",
    label: "Billing",
    icon: Receipt,
    path: "billing",
    color: "text-green-600 bg-green-50 hover:bg-green-100 border-green-200",
    activeColor: "bg-green-600 text-white border-green-600",
  },
  {
    id: "tables",
    label: "Tables",
    icon: Grid3X3,
    path: "tables",
    color: "text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200",
    activeColor: "bg-purple-600 text-white border-purple-600",
  },
];

export function QuickAccessToolbar({ restaurantSlug }: QuickAccessToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Determine active tab based on current path
  const getActiveTab = () => {
    const path = pathname.split("/").pop();
    return quickAccessItems.find(item => item.path === path)?.id || null;
  };

  const activeTab = getActiveTab();

  const handleTabClick = (path: string) => {
    router.push(`/${restaurantSlug}/${path}`);
  };

  return (
    <div className="sticky top-16 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 py-2 overflow-x-auto scrollbar-hide">
          {quickAccessItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.path)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm whitespace-nowrap transition-all",
                  isActive ? item.activeColor : item.color
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
