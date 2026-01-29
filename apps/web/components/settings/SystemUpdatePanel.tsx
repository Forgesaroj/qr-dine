"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Switch } from "@qr-dine/ui";
import { Badge } from "@qr-dine/ui";
import { Label } from "@qr-dine/ui";
import {
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Server,
  GitBranch,
  Clock,
  HardDrive,
  Cpu,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemStatus {
  git: {
    branch: string;
    commit: string;
    commitDate: string;
    commitMessage: string;
    updatesAvailable: boolean;
    commitsBehind: number;
  };
  system: {
    hostname?: string;
    uptime?: string;
    memory?: string;
    disk?: string;
  };
  projectRoot: string;
}

interface UpdateResult {
  success: boolean;
  message: string;
  previousCommit: string;
  currentCommit: string;
  branch: string;
  duration: string;
  steps: {
    step: string;
    success: boolean;
    output?: string;
    error?: string;
  }[];
  logs: string[];
}

export function SystemUpdatePanel() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Options
  const [restartService, setRestartService] = useState(false);
  const [skipBuild, setSkipBuild] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/system/update");

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch system status");
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    } finally {
      setLoading(false);
    }
  };

  const triggerUpdate = async () => {
    if (!confirm("Are you sure you want to update the system? This may cause a brief interruption.")) {
      return;
    }

    try {
      setUpdating(true);
      setUpdateResult(null);
      setError(null);

      const response = await fetch("/api/system/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restartService, skipBuild }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Update failed");
      }

      setUpdateResult(data);

      // Refresh status after update
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            System Update
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          System Update
        </CardTitle>
        <CardDescription>
          Update source code from repository on Raspberry Pi
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Error:</span> {error}
            </div>
          </div>
        )}

        {/* Git Status */}
        {status && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Repository Status
              </h4>
              <Button variant="ghost" size="sm" onClick={fetchStatus}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground">Branch</span>
                <div className="font-mono bg-muted px-2 py-1 rounded">
                  {status.git.branch}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Commit</span>
                <div className="font-mono bg-muted px-2 py-1 rounded">
                  {status.git.commit}
                </div>
              </div>
              <div className="col-span-2 space-y-1">
                <span className="text-muted-foreground">Last Commit</span>
                <div className="text-xs text-muted-foreground">
                  {status.git.commitMessage}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {status.git.commitDate}
                </div>
              </div>
            </div>

            {/* Updates Available Badge */}
            <div className="flex items-center gap-2">
              {status.git.updatesAvailable ? (
                <Badge variant="default" className="bg-blue-500">
                  <Download className="h-3 w-3 mr-1" />
                  {status.git.commitsBehind} update{status.git.commitsBehind > 1 ? "s" : ""} available
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Up to date
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* System Info (Raspberry Pi) */}
        {status?.system && Object.keys(status.system).length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              System Information
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {status.system.hostname && (
                <div className="space-y-1">
                  <span className="text-muted-foreground">Hostname</span>
                  <div className="font-mono bg-muted px-2 py-1 rounded">
                    {status.system.hostname}
                  </div>
                </div>
              )}
              {status.system.uptime && (
                <div className="space-y-1">
                  <span className="text-muted-foreground">Uptime</span>
                  <div className="font-mono bg-muted px-2 py-1 rounded text-xs">
                    {status.system.uptime}
                  </div>
                </div>
              )}
              {status.system.memory && (
                <div className="space-y-1">
                  <span className="text-muted-foreground">Memory</span>
                  <div className="font-mono bg-muted px-2 py-1 rounded">
                    {status.system.memory}
                  </div>
                </div>
              )}
              {status.system.disk && (
                <div className="space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <HardDrive className="h-3 w-3" /> Disk
                  </span>
                  <div className="font-mono bg-muted px-2 py-1 rounded text-xs">
                    {status.system.disk}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Update Options */}
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium">Update Options</h4>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="restart-service">Restart service after update</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically restart the application using PM2 or systemctl
                </p>
              </div>
              <Switch
                id="restart-service"
                checked={restartService}
                onChange={setRestartService}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="skip-build">Skip build step</Label>
                <p className="text-xs text-muted-foreground">
                  Only pull code without rebuilding (faster but may cause issues)
                </p>
              </div>
              <Switch
                id="skip-build"
                checked={skipBuild}
                onChange={setSkipBuild}
              />
            </div>
          </div>
        </div>

        {/* Update Button */}
        <div className="pt-4 border-t">
          <Button
            onClick={triggerUpdate}
            disabled={updating}
            className="w-full"
            size="lg"
          >
            {updating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Update Source Code
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-2">
            This will pull latest code, install dependencies, and rebuild the application
          </p>
        </div>

        {/* Update Result */}
        {updateResult && (
          <div className="space-y-4 pt-4 border-t">
            <div
              className={cn(
                "p-4 rounded-lg border",
                updateResult.success
                  ? "bg-green-50 border-green-200"
                  : "bg-yellow-50 border-yellow-200"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                {updateResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
                <span className="font-medium">{updateResult.message}</span>
              </div>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Duration:</span>{" "}
                  {updateResult.duration}
                </div>
                <div>
                  <span className="text-muted-foreground">Commit:</span>{" "}
                  <span className="font-mono">{updateResult.previousCommit}</span>
                  {" → "}
                  <span className="font-mono">{updateResult.currentCommit}</span>
                </div>
              </div>
            </div>

            {/* Step Results */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Update Steps</h4>
              <div className="space-y-1">
                {updateResult.steps.map((step, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-2 text-sm p-2 rounded",
                      step.success ? "bg-green-50" : "bg-red-50"
                    )}
                  >
                    {step.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    )}
                    <span className="flex-1">{step.step}</span>
                    {step.error && (
                      <span className="text-xs text-red-600 truncate max-w-[200px]">
                        {step.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
