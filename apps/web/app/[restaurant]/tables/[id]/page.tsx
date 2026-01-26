"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  Alert,
} from "@qr-dine/ui";
import { ArrowLeft, Loader2, Save, AlertCircle, Trash2, QrCode } from "lucide-react";
import Link from "next/link";

export default function EditTablePage() {
  const router = useRouter();
  const params = useParams();
  const restaurant = params.restaurant as string;
  const tableId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    tableNumber: "",
    name: "",
    capacity: "4",
    floor: "",
    section: "",
    status: "AVAILABLE",
  });

  useEffect(() => {
    fetchTable();
  }, [tableId]);

  const fetchTable = async () => {
    try {
      const response = await fetch(`/api/tables/${tableId}`);
      const data = await response.json();

      if (response.ok) {
        setFormData({
          tableNumber: data.table.tableNumber,
          name: data.table.name || "",
          capacity: data.table.capacity.toString(),
          floor: data.table.floor || "",
          section: data.table.section || "",
          status: data.table.status,
        });
      } else {
        setError(data.error || "Failed to fetch table");
      }
    } catch (err) {
      setError("Failed to fetch table");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/tables/${tableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update table");
        setIsLoading(false);
        return;
      }

      router.push(`/${restaurant}/tables`);
      router.refresh();
    } catch (err) {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this table?")) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/tables/${tableId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to delete table");
        setIsDeleting(false);
        return;
      }

      router.push(`/${restaurant}/tables`);
      router.refresh();
    } catch (err) {
      setError("Network error. Please try again.");
      setIsDeleting(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${restaurant}/tables`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Edit Table {formData.tableNumber}</h1>
          <p className="text-muted-foreground">Update table details</p>
        </div>
        <Link href={`/${restaurant}/tables/${tableId}/qr`}>
          <Button variant="outline" size="sm">
            <QrCode className="mr-2 h-4 w-4" />
            QR Code
          </Button>
        </Link>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Table Details</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <span className="ml-2">{error}</span>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Table Number *"
              placeholder="e.g., 1, 2, A1, VIP-1"
              value={formData.tableNumber}
              onChange={(e) =>
                setFormData({ ...formData, tableNumber: e.target.value })
              }
              required
            />

            <Input
              label="Table Name (Optional)"
              placeholder="e.g., Window Seat, Garden View"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />

            <Select
              label="Seating Capacity"
              value={formData.capacity}
              onChange={(value) =>
                setFormData({ ...formData, capacity: value })
              }
              options={[
                { value: "1", label: "1 person" },
                { value: "2", label: "2 people" },
                { value: "4", label: "4 people" },
                { value: "6", label: "6 people" },
                { value: "8", label: "8 people" },
                { value: "10", label: "10 people" },
                { value: "12", label: "12+ people" },
              ]}
            />

            <Select
              label="Status"
              value={formData.status}
              onChange={(value) =>
                setFormData({ ...formData, status: value })
              }
              options={[
                { value: "AVAILABLE", label: "Available" },
                { value: "OCCUPIED", label: "Occupied" },
                { value: "RESERVED", label: "Reserved" },
                { value: "CLEANING", label: "Cleaning" },
                { value: "BLOCKED", label: "Blocked" },
              ]}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Floor (Optional)"
                placeholder="e.g., Ground, 1st, Rooftop"
                value={formData.floor}
                onChange={(e) =>
                  setFormData({ ...formData, floor: e.target.value })
                }
              />

              <Input
                label="Section (Optional)"
                placeholder="e.g., Indoor, Outdoor, VIP"
                value={formData.section}
                onChange={(e) =>
                  setFormData({ ...formData, section: e.target.value })
                }
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Link href={`/${restaurant}/tables`} className="flex-1">
                <Button variant="outline" className="w-full" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
