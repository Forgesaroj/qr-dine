"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Demo page that sets role and redirects to dashboard
// Open each role in a separate tab for multi-role demo
export default function DemoRolePage() {
  const params = useParams();
  const router = useRouter();
  const role = (params.role as string).toUpperCase();
  const restaurant = params.restaurant as string;
  const [status, setStatus] = useState("Setting up demo role...");

  useEffect(() => {
    const setupDemoRole = async () => {
      const validRoles = ["OWNER", "MANAGER", "WAITER", "KITCHEN", "HOST"];

      if (!validRoles.includes(role)) {
        setStatus(`Invalid role: ${role}`);
        return;
      }

      try {
        const res = await fetch("/api/auth/demo-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ role }),
        });

        if (res.ok) {
          setStatus(`Switched to ${role} view. Redirecting...`);
          // Redirect to dashboard
          router.push(`/${restaurant}/dashboard`);
        } else {
          setStatus("Failed to set demo role");
        }
      } catch (error) {
        setStatus("Error setting demo role");
        console.error(error);
      }
    };

    setupDemoRole();
  }, [role, restaurant, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">{status}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Role: {role}
        </p>
      </div>
    </div>
  );
}
