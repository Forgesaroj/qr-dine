import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@qr-dine/ui";
import { Plus, QrCode, Edit2, Users, Clock, ShoppingBag, AlertCircle, ChefHat, Receipt, Sparkles, Link2 } from "lucide-react";
import Link from "next/link";
import { PrintAllQRCodes, TableOTPButton, TableStatusChanger, MarkAsCleanedButton, CleaningQueuePanel, MergeTablesButton, UnmergeButton } from "@/components/tables";
import { getDurationInfo, formatDuration, determineSessionPhase } from "@/lib/session-duration";

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  OCCUPIED: "bg-blue-100 text-blue-800",
  RESERVED: "bg-purple-100 text-purple-800",
  CLEANING: "bg-orange-100 text-orange-800",
  BLOCKED: "bg-gray-100 text-gray-800",
  BILL_REQUESTED: "bg-yellow-100 text-yellow-800",
  NEEDS_ATTENTION: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  RESERVED: "Reserved",
  CLEANING: "Cleaning",
  BLOCKED: "Blocked",
  BILL_REQUESTED: "Bill Req.",
  NEEDS_ATTENTION: "Needs Help",
};

const phaseConfig: Record<string, { label: string; icon: typeof Users }> = {
  CREATED: { label: "Created", icon: Sparkles },
  SEATED: { label: "Seated", icon: Users },
  ORDERING: { label: "Ordering", icon: ShoppingBag },
  DINING: { label: "Dining", icon: ChefHat },
  BILL_REQUESTED: { label: "Bill", icon: Receipt },
  COMPLETED: { label: "Done", icon: Sparkles },
};

export default async function TablesPage({
  params,
}: {
  params: Promise<{ restaurant: string }>;
}) {
  const { restaurant } = await params;
  const session = await getSession();

  if (!session) {
    return null;
  }

  // Check if user is manager for detailed view
  const isManager = session.role === "MANAGER" || session.role === "OWNER";

  // Fetch tables with active sessions and merge info
  const tables = await prisma.table.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: { tableNumber: "asc" },
    include: {
      sessions: {
        where: { status: "ACTIVE" },
        take: 1,
        orderBy: { seatedAt: "desc" },
        select: {
          id: true,
          guestCount: true,
          status: true,
          phase: true,
          seatedAt: true,
          firstOrderAt: true,
          firstFoodServedAt: true,
          billRequestedAt: true,
          waiter: {
            select: { id: true, name: true },
          },
          _count: {
            select: { orders: true },
          },
        },
      },
      _count: {
        select: { orders: true },
      },
      // Table merge support
      mergedWith: {
        select: {
          id: true,
          tableNumber: true,
          name: true,
        },
      },
      mergedTables: {
        select: {
          id: true,
          tableNumber: true,
          name: true,
          capacity: true,
        },
      },
    },
  });

  type TableWithSession = typeof tables[number];
  const availableCount = tables.filter((t: TableWithSession) => t.status === "AVAILABLE").length;
  const occupiedCount = tables.filter((t: TableWithSession) => t.status === "OCCUPIED").length;
  const cleaningCount = tables.filter((t: TableWithSession) => t.status === "CLEANING").length;

  // Group tables by floor/section
  const floors: string[] = [...new Set<string>(tables.map((t: TableWithSession) => t.floor || "Main"))];

  // Helper function to calculate duration in minutes
  const calculateDuration = (seatedAt: Date | null) => {
    if (!seatedAt) return 0;
    return Math.floor((new Date().getTime() - new Date(seatedAt).getTime()) / 60000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tables</h1>
          <p className="text-muted-foreground">
            {tables.length} tables ({availableCount} available, {occupiedCount} occupied, {cleaningCount} cleaning)
          </p>
        </div>
        <div className="flex gap-2">
          <MergeTablesButton
            tables={tables.map((t: TableWithSession) => ({
              id: t.id,
              tableNumber: t.tableNumber,
              name: t.name,
              capacity: t.capacity,
              status: t.status,
              mergedWithId: t.mergedWithId,
            }))}
          />
          <PrintAllQRCodes
            tables={tables.map((t: TableWithSession) => ({
              id: t.id,
              tableNumber: t.tableNumber,
              name: t.name,
            }))}
            restaurantSlug={restaurant}
          />
          <Link href={`/${restaurant}/tables/new`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Table
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats with Duration Legend */}
      <div className="grid gap-4 md:grid-cols-5">
        {Object.entries(statusLabels).map(([status, label]) => {
          const count = tables.filter((t: TableWithSession) => t.status === status).length;
          return (
            <Card key={status}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-muted-foreground">{label}</p>
                  </div>
                  <div className={`h-3 w-3 rounded-full ${(statusColors[status] ?? "bg-gray-100").split(" ")[0] ?? ""}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Duration Legend */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground bg-slate-50 p-3 rounded-lg">
        <span className="font-medium">Duration:</span>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span>&lt;30m</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-yellow-500" />
          <span>30-60m</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-orange-500" />
          <span>60-90m</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span>&gt;90m</span>
        </div>
      </div>

      {/* Cleaning Queue Panel - shown when there are tables needing cleaning */}
      {cleaningCount > 0 && (
        <CleaningQueuePanel />
      )}

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No tables yet</p>
            <p className="text-muted-foreground mb-4">
              Add tables and generate QR codes for customer ordering
            </p>
            <Link href={`/${restaurant}/tables/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add First Table
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        floors.map((floor) => (
          <div key={floor} className="space-y-4">
            <h2 className="text-lg font-semibold">{floor} Floor</h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {tables
                .filter((t: TableWithSession) => (t.floor || "Main") === floor)
                .map((table: TableWithSession) => {
                  const activeSession = table.sessions[0] || null;
                  const duration = activeSession?.seatedAt ? calculateDuration(activeSession.seatedAt) : 0;
                  const durationInfo = activeSession?.seatedAt ? getDurationInfo(duration) : null;
                  const phase = activeSession
                    ? determineSessionPhase({
                        otpVerified: true,
                        firstOrderAt: activeSession.firstOrderAt,
                        firstFoodServedAt: activeSession.firstFoodServedAt,
                        billRequestedAt: activeSession.billRequestedAt,
                      })
                    : null;
                  const PhaseIcon = phase ? phaseConfig[phase]?.icon || Users : Users;

                  return (
                    <Card
                      key={table.id}
                      className={`relative transition-all hover:shadow-md ${
                        durationInfo?.isAlert ? "ring-2 ring-red-300" : ""
                      }`}
                    >
                      {/* Duration indicator bar for occupied tables */}
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
                          <CardTitle className="text-lg">
                            Table {table.tableNumber}
                          </CardTitle>
                          <TableStatusChanger
                            tableId={table.id}
                            currentStatus={table.status}
                            compact
                          />
                        </div>
                        {table.name && (
                          <p className="text-sm text-muted-foreground">{table.name}</p>
                        )}
                        {/* Merged Table Indicator */}
                        {table.mergedTables && table.mergedTables.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1">
                            <Link2 className="h-3 w-3" />
                            <span>Merged with T{table.mergedTables.map(t => t.tableNumber).join(", T")}</span>
                            <span className="text-muted-foreground ml-1">
                              ({table.capacity + table.mergedTables.reduce((sum, t) => sum + t.capacity, 0)} seats)
                            </span>
                          </div>
                        )}
                        {table.mergedWithId && table.mergedWith && (
                          <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1">
                            <Link2 className="h-3 w-3" />
                            <span>Merged with Table {table.mergedWith.tableNumber}</span>
                          </div>
                        )}
                        {/* OTP Display - show on all tables */}
                        {table.currentOtp && (
                          <p className="text-xs text-muted-foreground mt-1">
                            OTP: <span className="font-mono font-medium">{table.currentOtp}</span>
                          </p>
                        )}
                      </CardHeader>
                      <CardContent>
                        {/* Session info for occupied tables */}
                        {activeSession && table.status === "OCCUPIED" ? (
                          <div className="space-y-3">
                            {/* Guest count and duration */}
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {activeSession.guestCount || "?"} guests
                                </span>
                              </div>
                              {durationInfo && (
                                <div
                                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${durationInfo.colorBg} ${durationInfo.colorText}`}
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                  <span className="text-xs font-medium">
                                    {formatDuration(duration)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Phase indicator */}
                            {phase && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Phase:</span>
                                <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 bg-slate-100 rounded-full">
                                  <PhaseIcon className="h-3 w-3" />
                                  {phaseConfig[phase]?.label || phase}
                                </span>
                              </div>
                            )}

                            {/* Orders count */}
                            {activeSession._count && activeSession._count.orders > 0 && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <ShoppingBag className="h-4 w-4" />
                                <span>{activeSession._count.orders} order(s)</span>
                              </div>
                            )}

                            {/* Waiter info - Manager view */}
                            {isManager && activeSession.waiter && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="h-4 w-4" />
                                <span>Waiter: {activeSession.waiter.name}</span>
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

                            {/* Quick actions for occupied tables */}
                            <div className="flex gap-2 pt-2">
                              <Link href={`/${restaurant}/tables/${table.id}`} className="flex-1">
                                <Button variant="outline" size="sm" className="w-full text-xs">
                                  Details
                                </Button>
                              </Link>
                              <Link href={`/${restaurant}/orders?table=${table.id}`} className="flex-1">
                                <Button variant="outline" size="sm" className="w-full text-xs">
                                  Orders
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ) : (
                          /* Original card content for non-occupied tables */
                          <>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="h-4 w-4" />
                                <span>{table.capacity} seats</span>
                              </div>
                              {table.section && (
                                <span className="text-sm text-muted-foreground">
                                  {table.section}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 mb-3">
                              <Link href={`/${restaurant}/tables/${table.id}/qr`} className="flex-1">
                                <Button variant="outline" size="sm" className="w-full">
                                  <QrCode className="mr-2 h-4 w-4" />
                                  QR Code
                                </Button>
                              </Link>
                              <Link href={`/${restaurant}/tables/${table.id}`}>
                                <Button variant="ghost" size="sm">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                            {/* OTP Regeneration Button */}
                            <TableOTPButton
                              tableId={table.id}
                              currentOtp={table.currentOtp}
                              otpGeneratedAt={table.otpGeneratedAt}
                            />
                            {/* Cleaning status - show Mark as Cleaned button */}
                            {table.status === "CLEANING" && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                  <Clock className="h-4 w-4" />
                                  <span>Ready for cleaning</span>
                                </div>
                                <MarkAsCleanedButton tableId={table.id} />
                              </div>
                            )}
                            {/* Unmerge button for merged tables */}
                            {(table.mergedTables?.length > 0 || table.mergedWithId) && (
                              <div className="mt-2">
                                <UnmergeButton
                                  tableId={table.id}
                                  isPrimary={table.mergedTables?.length > 0}
                                  className="w-full"
                                />
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
