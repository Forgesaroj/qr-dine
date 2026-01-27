"use client";

import { useState } from "react";
import { Button } from "@qr-dine/ui";
import { CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface MarkAsCleanedButtonProps {
  tableId: string;
}

export function MarkAsCleanedButton({ tableId }: MarkAsCleanedButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleMarkAsCleaned = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tables/${tableId}/cleaning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to mark as cleaned");
      }
    } catch (error) {
      console.error("Error marking table as cleaned:", error);
      alert("Failed to mark as cleaned");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleMarkAsCleaned}
      disabled={loading}
      size="sm"
      className="w-full bg-green-600 hover:bg-green-700 text-white"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <CheckCircle className="h-4 w-4 mr-2" />
      )}
      Mark as Cleaned
    </Button>
  );
}
