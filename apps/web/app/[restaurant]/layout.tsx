import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard";
import { getRolePermissions } from "@/lib/get-role-permissions";

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ restaurant: string }>;
}) {
  const { restaurant } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Verify the user has access to this restaurant
  if (session.restaurantSlug !== restaurant) {
    redirect("/login");
  }

  // Fetch user and restaurant details
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { restaurant: true },
  });

  if (!user) {
    redirect("/login");
  }

  // Use session.role which includes demo role override
  const effectiveRole = session.role;

  // Fetch permissions from database (with fallback to defaults)
  const permissions = await getRolePermissions(session.restaurantId, effectiveRole);

  return (
    <div className="min-h-screen bg-background">
      <DashboardShell
        user={{
          name: user.name,
          email: user.email,
          role: effectiveRole,
        }}
        restaurantSlug={restaurant}
        restaurantName={user.restaurant.name}
        allowedPages={permissions.pages}
      >
        {children}
      </DashboardShell>
    </div>
  );
}
