"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import {
  Users,
  Clock,
  ShoppingBag,
  AlertCircle,
  ChefHat,
  Receipt,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  getDurationInfo,
  minutesSince,
  formatDuration,
  determineSessionPhase,
} from "@/lib/session-duration";

interface TableSession {
  id: string;
  guestCount: number | null;
  status: string;
  phase: string;
  seatedAt: string | null;
  firstOrderAt: string | null;
  firstFoodServedAt: string | null;
  billRequestedAt: string | null;
  waiter?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    orders: number;
  };
}

interface TableSessionCardProps {
  table: {
    id: string;
    tableNumber: string;
    name: string | null;
    status: string;
    capacity: number;
    floor: string | null;
    section: string | null;
    currentOtp: string | null;
  };
  session: TableSession | null;
  restaurantSlug: string;
  isManagerView?: boolean;
}

const tableStatusConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  AVAILABLE: {
    label: "Available",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  OCCUPIED: {
    label: "Occupied",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  RESERVED: {
    label: "Reserved",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  CLEANING: {
    label: "Cleaning",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  BLOCKED: {
    label: "Blocked",
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
  },
};

const phaseLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  CREATED: { label: "Created", icon: <Sparkles className="h-3 w-3" /> },
  SEATED: { label: "Seated", icon: <Users className="h-3 w-3" /> },
  ORDERING: { label: "Ordering", icon: <ShoppingBag className="h-3 w-3" /> },
  DINING: { label: "Dining", icon: <ChefHat className="h-3 w-3" /> },
  BILL_REQUESTED: { label: "Bill", icon: <Receipt className="h-3 w-3" /> },
  COMPLETED: { label: "Done", icon: <Sparkles className="h-3 w-3" /> },
};

export function TableSessionCard({
  table,
  session,
  restaurantSlug,
  isManagerView = false,
}: TableSessionCardProps) {
  const [currentDuration, setCurrentDuration] = useState(0);

  // Update duration every minute
  useEffect(() => {
    if (!session?.seatedAt) return;

    const updateDuration = () => {
      setCurrentDuration(minutesSince(session.seatedAt));
    };

    updateDuration();
    const interval = setInterval(updateDuration, 60000);
    return () => clearInterval(interval);
  }, [session?.seatedAt]);

  const statusConfig = tableStatusConfig[table.status] ?? {
    label: "Unknown",
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
  };
  const durationInfo = session?.seatedAt ? getDurationInfo(currentDuration) : null;
  const phase = session
    ? determineSessionPhase({
        otpVerified: true,
        firstOrderAt: session.firstOrderAt,
        firstFoodServedAt: session.firstFoodServedAt,
        billRequestedAt: session.billRequestedAt,
      })
    : null;
  const phaseInfo = phase ? phaseLabels[phase] : null;

  return (
    <Card
      className={`relative transition-all hover:shadow-md ${
        durationInfo?.isAlert ? "ring-2 ring-red-300" : ""
      }`}
    >
      {/* Duration indicator bar */}
      {durationInfo && table.status === "OCCUPIED" && (
        <div
          className={`absolute top-0 left-0 right-0 h-1 rounded-t-lg ${
            durationInfo.color === "green"
              ? "bg-green-500"
              : durationInfo.color === "yellow"
              ? "bg-yellow-500"
              : durationInfo.color === "orange"
              ? "bg-orange-500"
              : "bg-red-500"
          }`}
        />
      )}

      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Table {table.tableNumber}
          </CardTitle>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border`}
          >
            {statusConfig.label}
          </span>
        </div>
        {table.name && (
          <p className="text-sm text-muted-foreground">{table.name}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Session Info - Only show for occupied tables */}
        {session && table.status === "OCCUPIED" && (
          <>
            {/* Guest count and duration */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {session.guestCount || "?"} guests
                </span>
              </div>
              {durationInfo && (
                <div
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${durationInfo.colorBg} ${durationInfo.colorText}`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
                    {formatDuration(currentDuration)}
                  </span>
                </div>
              )}
            </div>

            {/* Phase indicator */}
            {phaseInfo && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Phase:</span>
                <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 bg-slate-100 rounded-full">
                  {phaseInfo.icon}
                  {phaseInfo.label}
                </span>
              </div>
            )}

            {/* Orders count */}
            {session._count && session._count.orders > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShoppingBag className="h-4 w-4" />
                <span>{session._count.orders} order(s)</span>
              </div>
            )}

            {/* Waiter info - Manager view only */}
            {isManagerView && session.waiter && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Waiter: {session.waiter.name}</span>
              </div>
            )}

            {/* Alert indicator */}
            {durationInfo?.isAlert && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">
                  {durationInfo.alertLevel === "critical"
                    ? "Very long stay"
                    : "Long stay alert"}
                </span>
              </div>
            )}
          </>
        )}

        {/* Available table - show capacity */}
        {table.status === "AVAILABLE" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{table.capacity} seats</span>
          </div>
        )}

        {/* Cleaning status */}
        {table.status === "CLEANING" && (
          <div className="flex items-center gap-2 text-sm text-orange-600">
            <Clock className="h-4 w-4" />
            <span>Ready for cleaning</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Link href={`/${restaurantSlug}/tables/${table.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-xs">
              View Details
            </Button>
          </Link>
          {session && table.status === "OCCUPIED" && (
            <Link
              href={`/${restaurantSlug}/orders?table=${table.id}`}
              className="flex-1"
            >
              <Button variant="outline" size="sm" className="w-full text-xs">
                Orders
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
