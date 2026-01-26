"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  Calendar,
  Users,
  Utensils,
  AlertTriangle,
  MessageSquare,
  Target,
  Loader2,
  Check,
  CheckCircle,
  Edit,
  Save,
  Star,
  XCircle,
  Plus,
  Trash2,
} from "lucide-react";

interface DailyBriefing {
  id: string;
  date: string;
  expectedCovers: number | null;
  reservationsCount: number | null;
  specialEvents: string | null;
  specials: Array<{ name: string; description: string; price: number }>;
  eightySixed: string[];
  staffNotes: string | null;
  goals: string | null;
  managerMessage: string | null;
  readBy: string[];
  publishedBy: { id: string; name: string } | null;
  publishedAt: string | null;
}

export default function BriefingPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [editing, setEditing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  const [form, setForm] = useState({
    expectedCovers: "",
    reservationsCount: "",
    specialEvents: "",
    specials: [] as Array<{ name: string; description: string; price: number }>,
    eightySixed: [] as string[],
    staffNotes: "",
    goals: "",
    managerMessage: "",
  });

  const [newSpecial, setNewSpecial] = useState({ name: "", description: "", price: "" });
  const [new86Item, setNew86Item] = useState("");

  useEffect(() => {
    fetchBriefing();
    fetchCurrentUser();
  }, [selectedDate]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUserId(data.user.id);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const fetchBriefing = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/briefing?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setBriefing(data.briefing);
        if (data.briefing) {
          setForm({
            expectedCovers: data.briefing.expectedCovers?.toString() || "",
            reservationsCount: data.briefing.reservationsCount?.toString() || "",
            specialEvents: data.briefing.specialEvents || "",
            specials: data.briefing.specials || [],
            eightySixed: data.briefing.eightySixed || [],
            staffNotes: data.briefing.staffNotes || "",
            goals: data.briefing.goals || "",
            managerMessage: data.briefing.managerMessage || "",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching briefing:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveBriefing = async (publish = false) => {
    setSaving(true);
    try {
      const method = briefing ? "PATCH" : "POST";
      const url = briefing ? `/api/briefing/${briefing.id}` : "/api/briefing";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          expectedCovers: form.expectedCovers ? parseInt(form.expectedCovers) : null,
          reservationsCount: form.reservationsCount ? parseInt(form.reservationsCount) : null,
          specialEvents: form.specialEvents || null,
          specials: form.specials,
          eightySixed: form.eightySixed,
          staffNotes: form.staffNotes || null,
          goals: form.goals || null,
          managerMessage: form.managerMessage || null,
          publish,
        }),
      });

      if (res.ok) {
        setEditing(false);
        fetchBriefing();
      }
    } catch (error) {
      console.error("Error saving briefing:", error);
    } finally {
      setSaving(false);
    }
  };

  const markAsRead = async () => {
    if (!briefing) return;
    try {
      await fetch(`/api/briefing/${briefing.id}/read`, {
        method: "POST",
      });
      fetchBriefing();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const addSpecial = () => {
    if (!newSpecial.name) return;
    setForm((prev) => ({
      ...prev,
      specials: [
        ...prev.specials,
        {
          name: newSpecial.name,
          description: newSpecial.description,
          price: parseFloat(newSpecial.price) || 0,
        },
      ],
    }));
    setNewSpecial({ name: "", description: "", price: "" });
  };

  const removeSpecial = (index: number) => {
    setForm((prev) => ({
      ...prev,
      specials: prev.specials.filter((_, i) => i !== index),
    }));
  };

  const add86Item = () => {
    if (!new86Item.trim()) return;
    setForm((prev) => ({
      ...prev,
      eightySixed: [...prev.eightySixed, new86Item.trim()],
    }));
    setNew86Item("");
  };

  const remove86Item = (item: string) => {
    setForm((prev) => ({
      ...prev,
      eightySixed: prev.eightySixed.filter((i) => i !== item),
    }));
  };

  const isRead = briefing?.readBy?.includes(currentUserId);
  const isPublished = !!briefing?.publishedAt;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daily Briefing</h1>
          <p className="text-muted-foreground">
            Today's specials, 86'd items, and team updates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          {!editing ? (
            <Button onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={() => saveBriefing(false)} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button onClick={() => saveBriefing(true)} disabled={saving}>
                Publish
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Read Status Banner */}
      {briefing && isPublished && !isRead && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="font-medium text-amber-900">
                Please read and acknowledge today's briefing
              </span>
            </div>
            <Button onClick={markAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark as Read
            </Button>
          </CardContent>
        </Card>
      )}

      {isPublished && isRead && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">You have read today's briefing</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Expected Covers</label>
                {editing ? (
                  <Input
                    type="number"
                    value={form.expectedCovers}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, expectedCovers: e.target.value }))
                    }
                    placeholder="0"
                  />
                ) : (
                  <p className="text-2xl font-bold">
                    {briefing?.expectedCovers || "-"}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reservations</label>
                {editing ? (
                  <Input
                    type="number"
                    value={form.reservationsCount}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        reservationsCount: e.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                ) : (
                  <p className="text-2xl font-bold">
                    {briefing?.reservationsCount || "-"}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Special Events</label>
              {editing ? (
                <Input
                  value={form.specialEvents}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, specialEvents: e.target.value }))
                  }
                  placeholder="Any special events today..."
                />
              ) : (
                <p className="text-muted-foreground">
                  {briefing?.specialEvents || "No special events"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Today's Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <textarea
                value={form.goals}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, goals: e.target.value }))
                }
                placeholder="What are today's goals?"
                className="w-full px-3 py-2 border rounded-lg resize-none"
                rows={4}
              />
            ) : (
              <p className="whitespace-pre-wrap text-muted-foreground">
                {briefing?.goals || "No goals set"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Today's Specials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Today's Specials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.specials.length === 0 && !editing && (
              <p className="text-muted-foreground">No specials today</p>
            )}
            {form.specials.map((special, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{special.name}</p>
                  {special.description && (
                    <p className="text-sm text-muted-foreground">
                      {special.description}
                    </p>
                  )}
                  {special.price > 0 && (
                    <p className="text-sm font-medium text-green-600">
                      Rs.{special.price}
                    </p>
                  )}
                </div>
                {editing && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeSpecial(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
            {editing && (
              <div className="space-y-2 pt-2 border-t">
                <div className="grid gap-2 md:grid-cols-3">
                  <Input
                    value={newSpecial.name}
                    onChange={(e) =>
                      setNewSpecial((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Special name"
                  />
                  <Input
                    value={newSpecial.description}
                    onChange={(e) =>
                      setNewSpecial((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Description"
                  />
                  <Input
                    type="number"
                    value={newSpecial.price}
                    onChange={(e) =>
                      setNewSpecial((prev) => ({ ...prev, price: e.target.value }))
                    }
                    placeholder="Price"
                  />
                </div>
                <Button size="sm" onClick={addSpecial}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Special
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 86'd Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              86'd Items (Out of Stock)
            </CardTitle>
            <CardDescription>
              Items that are unavailable today
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.eightySixed.length === 0 && !editing && (
              <p className="text-green-600 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                All items available
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {form.eightySixed.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full"
                >
                  {item}
                  {editing && (
                    <button onClick={() => remove86Item(item)}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {editing && (
              <div className="flex gap-2 pt-2 border-t">
                <Input
                  value={new86Item}
                  onChange={(e) => setNew86Item(e.target.value)}
                  placeholder="Item name"
                  onKeyDown={(e) => e.key === "Enter" && add86Item()}
                />
                <Button onClick={add86Item}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staff Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <textarea
                value={form.staffNotes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, staffNotes: e.target.value }))
                }
                placeholder="Notes for staff..."
                className="w-full px-3 py-2 border rounded-lg resize-none"
                rows={4}
              />
            ) : (
              <p className="whitespace-pre-wrap text-muted-foreground">
                {briefing?.staffNotes || "No staff notes"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Manager Message */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Manager's Message
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <textarea
                value={form.managerMessage}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, managerMessage: e.target.value }))
                }
                placeholder="Message from management..."
                className="w-full px-3 py-2 border rounded-lg resize-none"
                rows={4}
              />
            ) : (
              <p className="whitespace-pre-wrap text-muted-foreground">
                {briefing?.managerMessage || "No message"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
