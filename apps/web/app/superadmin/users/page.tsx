"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Users, Construction } from "lucide-react";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage all users across restaurants
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Construction className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Coming Soon</p>
            <p className="text-sm">User management features are under development</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
