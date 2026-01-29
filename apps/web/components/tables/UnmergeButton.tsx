"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@qr-dine/ui";
import { Loader2, Unlink } from "lucide-react";

interface UnmergeButtonProps {
  tableId: string;
  isPrimary?: boolean;
  className?: string;
}

export function UnmergeButton({ tableId, isPrimary = false, className }: UnmergeButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUnmerge = async () => {
    if (!confirm(isPrimary
      ? "This will unmerge all tables from this group. Continue?"
      : "This will remove this table from the merge group. Continue?"
    )) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/tables/unmerge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          unmergeAll: isPrimary,
        }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to unmerge table");
      }
    } catch (error) {
      console.error("Error unmerging table:", error);
      alert("Failed to unmerge table");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleUnmerge}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Unlink className="h-4 w-4 mr-1" />
          Unmerge
        </>
      )}
    </Button>
  );
}
