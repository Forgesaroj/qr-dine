"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldX, ArrowLeft } from "lucide-react";
import { Button, Card, CardContent } from "@qr-dine/ui";
import { canAccessPage, hasPermission, getDefaultPage, type PageAccess, type Permission } from "@/lib/permissions";

interface RoleGuardProps {
  children: React.ReactNode;
  userRole: string;
  requiredPage?: PageAccess;
  requiredPermission?: Permission;
  restaurantSlug: string;
  fallback?: React.ReactNode;
}

export function RoleGuard({
  children,
  userRole,
  requiredPage,
  requiredPermission,
  restaurantSlug,
  fallback,
}: RoleGuardProps) {
  const router = useRouter();

  // Check page access
  if (requiredPage && !canAccessPage(userRole, requiredPage)) {
    return fallback || <AccessDenied userRole={userRole} restaurantSlug={restaurantSlug} />;
  }

  // Check specific permission
  if (requiredPermission && !hasPermission(userRole, requiredPermission)) {
    return fallback || <AccessDenied userRole={userRole} restaurantSlug={restaurantSlug} />;
  }

  return <>{children}</>;
}

interface AccessDeniedProps {
  userRole: string;
  restaurantSlug: string;
}

function AccessDenied({ userRole, restaurantSlug }: AccessDeniedProps) {
  const router = useRouter();
  const defaultPage = getDefaultPage(userRole);

  const handleGoBack = () => {
    router.back();
  };

  const handleGoToDefault = () => {
    router.push(`/${restaurantSlug}/${defaultPage}`);
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <ShieldX className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            You don&apos;t have permission to access this page.
            <br />
            <span className="text-sm">
              Your role: <span className="font-medium capitalize">{userRole.toLowerCase()}</span>
            </span>
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleGoBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={handleGoToDefault}>
              Go to {defaultPage.charAt(0).toUpperCase() + defaultPage.slice(1)}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Higher-order component for server components
export function withRoleCheck(
  WrappedComponent: React.ComponentType<{ userRole: string; restaurantSlug: string }>,
  requiredPage: PageAccess
) {
  return function RoleCheckedComponent({
    userRole,
    restaurantSlug,
    ...props
  }: {
    userRole: string;
    restaurantSlug: string;
  }) {
    if (!canAccessPage(userRole, requiredPage)) {
      return <AccessDenied userRole={userRole} restaurantSlug={restaurantSlug} />;
    }
    return <WrappedComponent userRole={userRole} restaurantSlug={restaurantSlug} {...props} />;
  };
}
