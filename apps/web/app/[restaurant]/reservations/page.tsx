"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
} from "@qr-dine/ui";
import {
  Loader2,
  Plus,
  Calendar,
  Clock,
  Users,
  Phone,
  Mail,
  MapPin,
  Check,
  X,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Cake,
  PartyPopper,
} from "lucide-react";

interface Table {
  id: string;
  tableNumber: string;
  name: string | null;
  capacity: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  tier: string;
  totalVisits?: number;
}

interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  date: string;
  time: string;
  partySize: number;
  status: string;
  notes: string | null;
  specialRequests: string | null;
  occasion: string | null;
  table: Table | null;
  customer: Customer | null;
  confirmedBy: { id: string; name: string } | null;
  seatedBy: { id: string; name: string } | null;
}

interface GroupedReservations {
  pending: Reservation[];
  confirmed: Reservation[];
  seated: Reservation[];
  completed: Reservation[];
  cancelled: Reservation[];
  noShow: Reservation[];
}

export default function ReservationsPage() {
  const params = useParams();
  const restaurantSlug = params.restaurant as string;

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [grouped, setGrouped] = useState<GroupedReservations | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0] ?? "");
  const [showForm, setShowForm] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    date: selectedDate,
    time: "12:00",
    partySize: "2",
    tableId: "",
    notes: "",
    specialRequests: "",
    occasion: "",
  });

  // Fetch reservations
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const res = await fetch(`/api/reservations?date=${selectedDate}`);
        const data = await res.json();

        if (res.ok) {
          setReservations(data.reservations || []);
          setGrouped(data.grouped || null);
        }
      } catch (error) {
        console.error("Error fetching reservations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, [selectedDate]);

  // Fetch tables
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await fetch("/api/tables");
        const data = await res.json();
        if (res.ok) {
          setTables(data.tables || []);
        }
      } catch (error) {
        console.error("Error fetching tables:", error);
      }
    };

    fetchTables();
  }, []);

  const handleDateChange = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split("T")[0] ?? "");
    setLoading(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          date: formData.date || selectedDate,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Add new reservation to list if same date
        if (formData.date === selectedDate) {
          setReservations((prev) => [...prev, data.reservation]);
        }
        setShowForm(false);
        setFormData({
          customerName: "",
          customerPhone: "",
          customerEmail: "",
          date: selectedDate,
          time: "12:00",
          partySize: "2",
          tableId: "",
          notes: "",
          specialRequests: "",
          occasion: "",
        });
      } else {
        alert(data.error || "Failed to create reservation");
      }
    } catch (error) {
      alert("Failed to create reservation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: string, extraData?: Record<string, unknown>) => {
    setActionLoading(id);

    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extraData }),
      });

      const data = await res.json();

      if (res.ok) {
        // Update reservation in list
        setReservations((prev) =>
          prev.map((r) => (r.id === id ? data.reservation : r))
        );
      } else {
        alert(data.error || "Action failed");
      }
    } catch (error) {
      alert("Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-amber-100 text-amber-700",
      CONFIRMED: "bg-blue-100 text-blue-700",
      SEATED: "bg-green-100 text-green-700",
      COMPLETED: "bg-gray-100 text-gray-700",
      CANCELLED: "bg-red-100 text-red-700",
      NO_SHOW: "bg-purple-100 text-purple-700",
    };

    return (
      <Badge className={styles[status] || "bg-gray-100"}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getOccasionIcon = (occasion: string | null) => {
    if (!occasion) return null;
    const lower = occasion.toLowerCase();
    if (lower.includes("birthday")) return <Cake className="h-4 w-4 text-pink-500" />;
    if (lower.includes("anniversary") || lower.includes("celebration"))
      return <PartyPopper className="h-4 w-4 text-purple-500" />;
    return null;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isToday = date.toDateString() === today.toDateString();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) return "Today";
    if (isTomorrow) return "Tomorrow";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reservations</h1>
          <p className="text-muted-foreground">Manage table reservations</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Reservation
        </Button>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => handleDateChange(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setLoading(true);
            }}
            className="w-auto"
          />
          <span className="font-medium">{formatDate(selectedDate)}</span>
        </div>
        <Button variant="outline" size="icon" onClick={() => handleDateChange(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">
              {grouped?.pending.length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {grouped?.confirmed.length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {grouped?.seated.length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Seated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {reservations.length}
            </div>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Reservations List */}
      <div className="space-y-4">
        {reservations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Reservations</h3>
              <p className="text-muted-foreground">
                No reservations for {formatDate(selectedDate)}
              </p>
            </CardContent>
          </Card>
        ) : (
          reservations.map((reservation) => (
            <Card key={reservation.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-semibold">{reservation.time}</span>
                      {getStatusBadge(reservation.status)}
                      {getOccasionIcon(reservation.occasion)}
                      {reservation.table && (
                        <Badge variant="outline">
                          <MapPin className="h-3 w-3 mr-1" />
                          Table {reservation.table.tableNumber}
                        </Badge>
                      )}
                    </div>

                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center gap-4">
                        <span className="font-medium">{reservation.customerName}</span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {reservation.partySize} guests
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {reservation.customerPhone}
                        </span>
                        {reservation.customerEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {reservation.customerEmail}
                          </span>
                        )}
                      </div>

                      {(reservation.notes || reservation.specialRequests) && (
                        <div className="text-muted-foreground">
                          {reservation.notes && <p>Note: {reservation.notes}</p>}
                          {reservation.specialRequests && (
                            <p>Special: {reservation.specialRequests}</p>
                          )}
                        </div>
                      )}

                      {reservation.customer && (
                        <Badge variant="secondary" className="w-fit">
                          {reservation.customer.tier} Member
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    {reservation.status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAction(reservation.id, "confirm")}
                          disabled={actionLoading === reservation.id}
                        >
                          {actionLoading === reservation.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Confirm
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction(reservation.id, "cancel")}
                          disabled={actionLoading === reservation.id}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </>
                    )}

                    {reservation.status === "CONFIRMED" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAction(reservation.id, "seat")}
                          disabled={actionLoading === reservation.id}
                        >
                          {actionLoading === reservation.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-1" />
                              Seat
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(reservation.id, "no_show")}
                          disabled={actionLoading === reservation.id}
                        >
                          <AlertCircle className="h-4 w-4 mr-1" />
                          No Show
                        </Button>
                      </>
                    )}

                    {reservation.status === "SEATED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(reservation.id, "complete")}
                        disabled={actionLoading === reservation.id}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* New Reservation Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <Card
            className="w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>New Reservation</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Guest Name *</label>
                  <Input
                    value={formData.customerName}
                    onChange={(e) =>
                      setFormData({ ...formData, customerName: e.target.value })
                    }
                    placeholder="Enter guest name"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Phone Number *</label>
                  <Input
                    value={formData.customerPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, customerPhone: e.target.value })
                    }
                    placeholder="Enter phone number"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, customerEmail: e.target.value })
                    }
                    placeholder="Enter email (optional)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Date *</label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Time *</label>
                    <Input
                      type="time"
                      value={formData.time}
                      onChange={(e) =>
                        setFormData({ ...formData, time: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Party Size *</label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.partySize}
                      onChange={(e) =>
                        setFormData({ ...formData, partySize: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Table</label>
                    <select
                      value={formData.tableId}
                      onChange={(e) =>
                        setFormData({ ...formData, tableId: e.target.value })
                      }
                      className="w-full h-10 px-3 border rounded-md"
                    >
                      <option value="">Select table (optional)</option>
                      {tables.map((table) => (
                        <option key={table.id} value={table.id}>
                          Table {table.tableNumber} ({table.capacity} seats)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Occasion</label>
                  <select
                    value={formData.occasion}
                    onChange={(e) =>
                      setFormData({ ...formData, occasion: e.target.value })
                    }
                    className="w-full h-10 px-3 border rounded-md"
                  >
                    <option value="">Select occasion (optional)</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Anniversary">Anniversary</option>
                    <option value="Business">Business</option>
                    <option value="Date">Date Night</option>
                    <option value="Celebration">Celebration</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Special Requests</label>
                  <Input
                    value={formData.specialRequests}
                    onChange={(e) =>
                      setFormData({ ...formData, specialRequests: e.target.value })
                    }
                    placeholder="e.g., Window seat, quiet area"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Input
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Internal notes"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Reservation"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
