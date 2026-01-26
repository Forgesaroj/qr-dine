"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Activity, CheckCircle, Construction } from "lucide-react";

export default function SystemHealthPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Health</h1>
        <p className="text-muted-foreground">
          Monitor system status and performance
        </p>
      </div>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="py-4 flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-medium text-green-800">All Systems Operational</p>
            <p className="text-sm text-green-600">No issues detected</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Construction className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Coming Soon</p>
            <p className="text-sm">Detailed metrics dashboard under development</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
