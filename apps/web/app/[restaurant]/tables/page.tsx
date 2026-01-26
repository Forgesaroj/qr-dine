import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@qr-dine/ui";
import { Plus, QrCode, Edit2, Users, MoreVertical } from "lucide-react";
import Link from "next/link";
import { PrintAllQRCodes, TableOTPButton } from "@/components/tables";

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  OCCUPIED: "bg-blue-100 text-blue-800",
  RESERVED: "bg-yellow-100 text-yellow-800",
  CLEANING: "bg-orange-100 text-orange-800",
  BLOCKED: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  RESERVED: "Reserved",
  CLEANING: "Cleaning",
  BLOCKED: "Blocked",
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

  const tables = await prisma.table.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: { tableNumber: "asc" },
    include: {
      _count: {
        select: { orders: true },
      },
    },
  });

  type TableWithCount = typeof tables[number];
  const availableCount = tables.filter((t: TableWithCount) => t.status === "AVAILABLE").length;
  const occupiedCount = tables.filter((t: TableWithCount) => t.status === "OCCUPIED").length;

  // Group tables by floor/section
  const floors: string[] = [...new Set<string>(tables.map((t: TableWithCount) => t.floor || "Main"))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tables</h1>
          <p className="text-muted-foreground">
            {tables.length} tables ({availableCount} available, {occupiedCount} occupied)
          </p>
        </div>
        <div className="flex gap-2">
          <PrintAllQRCodes
            tables={tables.map((t: TableWithCount) => ({
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

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        {Object.entries(statusLabels).map(([status, label]) => {
          const count = tables.filter((t: TableWithCount) => t.status === status).length;
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
                .filter((t: TableWithCount) => (t.floor || "Main") === floor)
                .map((table: TableWithCount) => (
                  <Card key={table.id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          Table {table.tableNumber}
                        </CardTitle>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[table.status]}`}
                        >
                          {statusLabels[table.status]}
                        </span>
                      </div>
                      {table.name && (
                        <p className="text-sm text-muted-foreground">{table.name}</p>
                      )}
                    </CardHeader>
                    <CardContent>
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
                      {/* OTP for Guest Access */}
                      <TableOTPButton
                        tableId={table.id}
                        currentOtp={table.currentOtp}
                        otpGeneratedAt={table.otpGeneratedAt}
                      />
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
