import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SuperAdminShell } from "./components/SuperAdminShell";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Only SUPER_ADMIN can access this section
  if (session.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <SuperAdminShell
        user={{
          name: "Super Admin",
          email: session.email || "",
          role: "SUPER_ADMIN",
        }}
      >
        {children}
      </SuperAdminShell>
    </div>
  );
}
