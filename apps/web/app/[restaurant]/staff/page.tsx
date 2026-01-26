import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, Button } from "@qr-dine/ui";
import { Plus, Edit2, Mail, Phone, Clock, User } from "lucide-react";
import Link from "next/link";

const roleColors: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-800",
  OWNER: "bg-blue-100 text-blue-800",
  MANAGER: "bg-indigo-100 text-indigo-800",
  CASHIER: "bg-green-100 text-green-800",
  WAITER: "bg-yellow-100 text-yellow-800",
  KITCHEN: "bg-orange-100 text-orange-800",
  HOST: "bg-pink-100 text-pink-800",
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  OWNER: "Owner",
  MANAGER: "Manager",
  CASHIER: "Cashier",
  WAITER: "Waiter",
  KITCHEN: "Kitchen",
  HOST: "Host",
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-800",
  SUSPENDED: "bg-red-100 text-red-800",
};

export default async function StaffPage({
  params,
}: {
  params: Promise<{ restaurant: string }>;
}) {
  const { restaurant } = await params;
  const session = await getSession();

  if (!session) {
    return null;
  }

  const staff = await prisma.user.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  type Staff = typeof staff[number];
  const activeStaff = staff.filter((s: Staff) => s.status === "ACTIVE").length;

  // Group staff by role
  const staffByRole = staff.reduce((acc: Record<string, Staff[]>, member: Staff) => {
    const role = member.role;
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(member);
    return acc;
  }, {} as Record<string, Staff[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground">
            {staff.length} staff members ({activeStaff} active)
          </p>
        </div>
        <Link href={`/${restaurant}/staff/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Staff
          </Button>
        </Link>
      </div>

      {/* Staff by Role */}
      {staff.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium">No staff members yet</p>
            <p className="text-muted-foreground mb-4">
              Add staff members to manage your team
            </p>
            <Link href={`/${restaurant}/staff/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add First Staff
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {staff.map((member: Staff) => (
            <Card key={member.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-medium text-primary">
                          {member.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{member.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[member.role]}`}
                        >
                          {roleLabels[member.role]}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[member.status]}`}
                        >
                          {member.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link href={`/${restaurant}/staff/${member.id}`}>
                    <Button variant="ghost" size="sm">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  {member.lastLoginAt && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        Last login:{" "}
                        {new Date(member.lastLoginAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {member.pin && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      PIN Login enabled
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
