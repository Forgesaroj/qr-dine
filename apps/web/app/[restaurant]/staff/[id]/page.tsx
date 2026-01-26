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
import { ArrowLeft, Loader2, Save, AlertCircle, Trash2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function EditStaffPage() {
  const router = useRouter();
  const params = useParams();
  const restaurant = params.restaurant as string;
  const staffId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "WAITER",
    status: "ACTIVE",
    pin: "",
  });

  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, [staffId]);

  const fetchStaff = async () => {
    try {
      const response = await fetch(`/api/staff/${staffId}`);
      const data = await response.json();

      if (response.ok) {
        setFormData({
          name: data.staff.name,
          email: data.staff.email,
          password: "", // Don't populate password
          phone: data.staff.phone || "",
          role: data.staff.role,
          status: data.staff.status,
          pin: "", // Don't populate pin
        });
        setHasPin(!!data.staff.pin);
      } else {
        setError(data.error || "Failed to fetch staff");
      }
    } catch (err) {
      setError("Failed to fetch staff");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Only send fields that have changed
    const updateData: Record<string, string> = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      status: formData.status,
    };

    // Only include password if user entered one
    if (formData.password) {
      updateData.password = formData.password;
    }

    // Only include PIN if user entered one
    if (formData.pin) {
      updateData.pin = formData.pin;
    }

    try {
      const response = await fetch(`/api/staff/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update staff");
        setIsLoading(false);
        return;
      }

      router.push(`/${restaurant}/staff`);
      router.refresh();
    } catch (err) {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this staff member?")) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/staff/${staffId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to delete staff");
        setIsDeleting(false);
        return;
      }

      router.push(`/${restaurant}/staff`);
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
        <Link href={`/${restaurant}/staff`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Edit Staff Member</h1>
          <p className="text-muted-foreground">Update staff details</p>
        </div>
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
          <CardTitle>Staff Details</CardTitle>
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
              label="Full Name *"
              placeholder="e.g., John Doe"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />

            <Input
              label="Email *"
              type="email"
              placeholder="staff@restaurant.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />

            <div className="relative">
              <Input
                label="New Password (Leave blank to keep current)"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
              />
            </div>

            <Input
              label="Phone (Optional)"
              type="tel"
              placeholder="+977 98XXXXXXXX"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />

            <Select
              label="Role *"
              value={formData.role}
              onChange={(value) => setFormData({ ...formData, role: value })}
              options={[
                { value: "MANAGER", label: "Manager" },
                { value: "CASHIER", label: "Cashier" },
                { value: "WAITER", label: "Waiter" },
                { value: "KITCHEN", label: "Kitchen Staff" },
                { value: "HOST", label: "Host" },
              ]}
            />

            <Select
              label="Status"
              value={formData.status}
              onChange={(value) => setFormData({ ...formData, status: value })}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
                { value: "SUSPENDED", label: "Suspended" },
              ]}
            />

            <div className="relative">
              <Input
                label={hasPin ? "New PIN (Leave blank to keep current)" : "PIN (Optional)"}
                type={showPin ? "text" : "password"}
                placeholder="4-6 digit PIN for quick login"
                value={formData.pin}
                onChange={(e) =>
                  setFormData({ ...formData, pin: e.target.value })
                }
                maxLength={6}
                pattern="[0-9]*"
                helperText={hasPin ? "PIN login is enabled. Enter new PIN to change." : "Staff can use this PIN for quick login on shared devices"}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {showPin ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Link href={`/${restaurant}/staff`} className="flex-1">
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
