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
  Plus,
  Clock,
  User,
  Tag,
  Check,
  CheckCircle,
  Loader2,
  StickyNote,
  Sun,
  Sunset,
  Moon,
  AlertTriangle,
  Info,
  Star,
} from "lucide-react";

interface ShiftNote {
  id: string;
  shiftDate: string;
  shiftType: string;
  notes: string;
  tags: string[];
  writtenBy: { id: string; name: string };
  readBy: string[];
  createdAt: string;
}

const shiftTypes = [
  { value: "MORNING", label: "Morning Shift", icon: Sun, time: "6AM - 2PM" },
  { value: "AFTERNOON", label: "Afternoon Shift", icon: Sunset, time: "2PM - 10PM" },
  { value: "NIGHT", label: "Night Shift", icon: Moon, time: "10PM - 6AM" },
];

const noteTags = [
  { value: "important", label: "Important", color: "bg-red-100 text-red-700" },
  { value: "follow-up", label: "Follow-up", color: "bg-yellow-100 text-yellow-700" },
  { value: "equipment", label: "Equipment", color: "bg-blue-100 text-blue-700" },
  { value: "customer", label: "Customer Issue", color: "bg-purple-100 text-purple-700" },
  { value: "inventory", label: "Inventory", color: "bg-green-100 text-green-700" },
  { value: "staff", label: "Staff", color: "bg-orange-100 text-orange-700" },
];

export default function ShiftNotesPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;

  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<ShiftNote[]>([]);
  const [showNewNote, setShowNewNote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [currentUserId, setCurrentUserId] = useState("");

  const [newNote, setNewNote] = useState({
    shiftType: "MORNING",
    notes: "",
    tags: [] as string[],
  });

  useEffect(() => {
    fetchNotes();
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

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shift-notes?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async () => {
    if (!newNote.notes.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/shift-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftDate: selectedDate,
          shiftType: newNote.shiftType,
          notes: newNote.notes,
          tags: newNote.tags,
        }),
      });

      if (res.ok) {
        setNewNote({ shiftType: "MORNING", notes: "", tags: [] });
        setShowNewNote(false);
        fetchNotes();
      }
    } catch (error) {
      console.error("Error creating note:", error);
    } finally {
      setSaving(false);
    }
  };

  const markAsRead = async (noteId: string) => {
    try {
      await fetch(`/api/shift-notes/${noteId}/read`, {
        method: "POST",
      });
      fetchNotes();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const toggleTag = (tag: string) => {
    setNewNote((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const getShiftIcon = (shiftType: string) => {
    const shift = shiftTypes.find((s) => s.value === shiftType);
    if (!shift) return <Clock className="h-4 w-4" />;
    const Icon = shift.icon;
    return <Icon className="h-4 w-4" />;
  };

  const isRead = (note: ShiftNote) => {
    return note.readBy?.includes(currentUserId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shift Notes</h1>
          <p className="text-muted-foreground">
            Handover notes between shifts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          <Button onClick={() => setShowNewNote(!showNewNote)}>
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        </div>
      </div>

      {/* New Note Form */}
      {showNewNote && (
        <Card>
          <CardHeader>
            <CardTitle>Create Shift Note</CardTitle>
            <CardDescription>
              Leave notes for the next shift
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Shift Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Shift Type</label>
              <div className="flex gap-3">
                {shiftTypes.map((shift) => (
                  <button
                    key={shift.value}
                    onClick={() =>
                      setNewNote((prev) => ({ ...prev, shiftType: shift.value }))
                    }
                    className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                      newNote.shiftType === shift.value
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    <shift.icon className="h-5 w-5 mx-auto mb-1" />
                    <p className="text-sm font-medium">{shift.label}</p>
                    <p className="text-xs text-muted-foreground">{shift.time}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes *</label>
              <textarea
                value={newNote.notes}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Write your handover notes here..."
                className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows={4}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap gap-2">
                {noteTags.map((tag) => (
                  <button
                    key={tag.value}
                    onClick={() => toggleTag(tag.value)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      newNote.tags.includes(tag.value)
                        ? tag.color
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowNewNote(false)}
              >
                Cancel
              </Button>
              <Button onClick={createNote} disabled={saving || !newNote.notes.trim()}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Note
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <StickyNote className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No shift notes</h3>
            <p className="text-muted-foreground text-center mt-1">
              No notes found for this date. Create one to leave important information for the next shift.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {shiftTypes.map((shiftType) => {
            const shiftNotes = notes.filter(
              (n) => n.shiftType === shiftType.value
            );
            if (shiftNotes.length === 0) return null;

            return (
              <div key={shiftType.value}>
                <div className="flex items-center gap-2 mb-3">
                  <shiftType.icon className="h-5 w-5" />
                  <h2 className="font-semibold">{shiftType.label}</h2>
                  <span className="text-sm text-muted-foreground">
                    ({shiftType.time})
                  </span>
                </div>
                <div className="space-y-3">
                  {shiftNotes.map((note) => (
                    <Card
                      key={note.id}
                      className={!isRead(note) ? "border-primary/50 bg-primary/5" : ""}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{note.writtenBy?.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(note.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {!isRead(note) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsRead(note.id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Mark Read
                            </Button>
                          )}
                          {isRead(note) && (
                            <span className="flex items-center gap-1 text-sm text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              Read
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap mb-3">{note.notes}</p>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {note.tags.map((tag) => {
                              const tagInfo = noteTags.find((t) => t.value === tag);
                              return (
                                <span
                                  key={tag}
                                  className={`px-2 py-0.5 rounded-full text-xs ${
                                    tagInfo?.color || "bg-muted"
                                  }`}
                                >
                                  {tagInfo?.label || tag}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
