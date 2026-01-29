"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Checkbox } from "@qr-dine/ui";
import { Loader2, Link2, Users, X } from "lucide-react";

interface Table {
  id: string;
  tableNumber: string;
  name: string | null;
  capacity: number;
  status: string;
  mergedWithId: string | null;
}

interface MergeTablesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tables: Table[];
  primaryTableId?: string;
}

export function MergeTablesDialog({
  open,
  onOpenChange,
  tables,
  primaryTableId,
}: MergeTablesDialogProps) {
  const [selectedPrimary, setSelectedPrimary] = useState<string | null>(primaryTableId || null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Filter available tables (not already merged)
  const availableTables = tables.filter(t => !t.mergedWithId);

  // Reset selections when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedPrimary(primaryTableId || null);
      setSelectedTables([]);
      setError(null);
    }
  }, [open, primaryTableId]);

  const handlePrimarySelect = (tableId: string) => {
    setSelectedPrimary(tableId);
    setSelectedTables(prev => prev.filter(id => id !== tableId));
  };

  const handleTableToggle = (tableId: string) => {
    if (tableId === selectedPrimary) return;

    setSelectedTables(prev =>
      prev.includes(tableId)
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const handleMerge = async () => {
    if (!selectedPrimary || selectedTables.length === 0) {
      setError("Please select a primary table and at least one table to merge");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tables/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryTableId: selectedPrimary,
          tableIds: selectedTables,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onOpenChange(false);
        router.refresh();
      } else {
        setError(data.error || "Failed to merge tables");
      }
    } catch (err) {
      console.error("Error merging tables:", err);
      setError("Failed to merge tables. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate total capacity
  const primaryTable = availableTables.find(t => t.id === selectedPrimary);
  const selectedTableObjects = availableTables.filter(t => selectedTables.includes(t.id));
  const totalCapacity = (primaryTable?.capacity || 0) + selectedTableObjects.reduce((sum, t) => sum + t.capacity, 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Merge Tables</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          <p className="text-sm text-muted-foreground">
            Select a primary table and additional tables to merge for a larger party.
          </p>

          {/* Primary Table Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Primary Table (orders will be linked here)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {availableTables.map(table => (
                <button
                  key={table.id}
                  onClick={() => handlePrimarySelect(table.id)}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    selectedPrimary === table.id
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium">T{table.tableNumber}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Users className="h-3 w-3" />
                    {table.capacity}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tables to Merge */}
          {selectedPrimary && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select tables to merge
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableTables
                  .filter(t => t.id !== selectedPrimary)
                  .map(table => (
                    <label
                      key={table.id}
                      className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                        selectedTables.includes(table.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Checkbox
                        checked={selectedTables.includes(table.id)}
                        onCheckedChange={() => handleTableToggle(table.id)}
                      />
                      <div className="flex-1">
                        <span className="font-medium">Table {table.tableNumber}</span>
                        {table.name && (
                          <span className="text-muted-foreground ml-1">({table.name})</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {table.capacity}
                      </div>
                    </label>
                  ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {selectedPrimary && selectedTables.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm">
                <span className="font-medium">Merging: </span>
                Table {primaryTable?.tableNumber} + {selectedTableObjects.map(t => t.tableNumber).join(", ")}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                <span className="font-medium">Total capacity: </span>
                {totalCapacity} guests
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleMerge}
            disabled={loading || !selectedPrimary || selectedTables.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Merging...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Merge Tables
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
