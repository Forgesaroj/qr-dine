"use client";

import { useState } from "react";
import { Button } from "@qr-dine/ui";
import { Link2 } from "lucide-react";
import { MergeTablesDialog } from "./MergeTablesDialog";

interface Table {
  id: string;
  tableNumber: string;
  name: string | null;
  capacity: number;
  status: string;
  mergedWithId: string | null;
}

interface TablesPageClientProps {
  tables: Table[];
}

export function MergeTablesButton({ tables }: TablesPageClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filter tables that can be merged (not already merged as secondary)
  const availableTables = tables.filter(t => !t.mergedWithId);

  if (availableTables.length < 2) {
    return null; // Need at least 2 tables to merge
  }

  return (
    <>
      <Button variant="outline" onClick={() => setDialogOpen(true)}>
        <Link2 className="mr-2 h-4 w-4" />
        Merge Tables
      </Button>
      <MergeTablesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tables={availableTables}
      />
    </>
  );
}
