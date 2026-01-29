"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@qr-dine/ui";
import { Sparkles, Clock, AlertTriangle, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface CleaningQueueItem {
  id: string;
  tableId: string;
  tableNumber: string;
  tableName: string | null;
  cleaningRequestedAt: string;
  waitingMinutes: number;
  sessionId: string | null;
  alertSent: boolean;
}

interface CleaningQueuePanelProps {
  initialQueue?: CleaningQueueItem[];
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function CleaningQueuePanel({
  initialQueue = [],
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds default
}: CleaningQueuePanelProps) {
  const [queue, setQueue] = useState<CleaningQueueItem[]>(initialQueue);
  const [loading, setLoading] = useState(false);
  const [markingCleaned, setMarkingCleaned] = useState<string | null>(null);
  const router = useRouter();

  const fetchQueue = useCallback(async () => {
    try {
      const response = await fetch("/api/tables/cleaning-queue");
      if (response.ok) {
        const data = await response.json();
        setQueue(data.queue || []);
      }
    } catch (error) {
      console.error("Error fetching cleaning queue:", error);
    }
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchQueue();
    setLoading(false);
  };

  const markAsCleaned = async (tableId: string) => {
    setMarkingCleaned(tableId);
    try {
      const response = await fetch(`/api/tables/${tableId}/cleaning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });

      if (response.ok) {
        // Remove from local queue
        setQueue((prev) => prev.filter((item) => item.tableId !== tableId));
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to mark as cleaned");
      }
    } catch (error) {
      console.error("Error marking table as cleaned:", error);
      alert("Failed to mark as cleaned");
    } finally {
      setMarkingCleaned(null);
    }
  };

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchQueue, refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefresh, refreshInterval, fetchQueue]);

  // Initial fetch
  useEffect(() => {
    if (initialQueue.length === 0) {
      fetchQueue();
    }
  }, [initialQueue.length, fetchQueue]);

  const getWaitingColor = (minutes: number): { bg: string; text: string } => {
    if (minutes < 5) return { bg: "bg-green-50", text: "text-green-700" };
    if (minutes < 10) return { bg: "bg-yellow-50", text: "text-yellow-700" };
    if (minutes < 15) return { bg: "bg-orange-50", text: "text-orange-700" };
    return { bg: "bg-red-50", text: "text-red-700" };
  };

  if (queue.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-orange-500" />
              Cleaning Queue
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm">All tables are clean!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-orange-500" />
            Cleaning Queue
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({queue.length} {queue.length === 1 ? "table" : "tables"})
            </span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {queue.map((item) => {
          const waitColor = getWaitingColor(item.waitingMinutes);
          const isMarking = markingCleaned === item.tableId;

          return (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${waitColor.bg}`}
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium">
                    Table {item.tableNumber}
                    {item.tableName && (
                      <span className="text-muted-foreground font-normal ml-1">
                        ({item.tableName})
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className={`h-3.5 w-3.5 ${waitColor.text}`} />
                    <span className={waitColor.text}>
                      Waiting {item.waitingMinutes} min
                    </span>
                    {item.alertSent && (
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Alert sent
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                onClick={() => markAsCleaned(item.tableId)}
                disabled={isMarking}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isMarking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Done
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
