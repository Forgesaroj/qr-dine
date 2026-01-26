"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@qr-dine/ui";
import {
  Loader2,
  ArrowLeft,
  Droplets,
  Hand,
  UtensilsCrossed,
  AlertTriangle,
  Receipt,
  HelpCircle,
  CheckCircle,
  Clock,
  X,
} from "lucide-react";
import { useGuest } from "../GuestContext";

interface AssistanceRequest {
  id: string;
  type: string;
  status: string;
  message: string | null;
  requestedAt: string;
  acknowledgedAt: string | null;
}

const ASSISTANCE_TYPES = [
  {
    type: "WATER_REFILL",
    label: "Water Refill",
    description: "Request water or beverages refill",
    icon: Droplets,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    type: "CALL_WAITER",
    label: "Call Waiter",
    description: "Request waiter assistance",
    icon: Hand,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
  },
  {
    type: "CUTLERY_NAPKINS",
    label: "Cutlery & Napkins",
    description: "Request additional cutlery or napkins",
    icon: UtensilsCrossed,
    color: "text-gray-500",
    bgColor: "bg-gray-50",
  },
  {
    type: "FOOD_ISSUE",
    label: "Food Issue",
    description: "Report an issue with your food",
    icon: AlertTriangle,
    color: "text-red-500",
    bgColor: "bg-red-50",
  },
  {
    type: "BILL_REQUEST",
    label: "Request Bill",
    description: "Ready to pay? Request your bill",
    icon: Receipt,
    color: "text-green-500",
    bgColor: "bg-green-50",
  },
  {
    type: "OTHER",
    label: "Other",
    description: "Any other assistance needed",
    icon: HelpCircle,
    color: "text-amber-500",
    bgColor: "bg-amber-50",
  },
];

export default function GuestAssistancePage() {
  const params = useParams();
  const router = useRouter();
  const { session } = useGuest();

  const restaurantSlug = params.restaurant as string;
  const tableId = params.table as string;

  const [activeRequests, setActiveRequests] = useState<AssistanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch active requests
  useEffect(() => {
    const fetchRequests = async () => {
      if (!session?.sessionId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/guest/assistance?sessionId=${session.sessionId}`);
        const data = await res.json();

        if (res.ok) {
          setActiveRequests(data.requests || []);
        }
      } catch (err) {
        console.error("Error fetching requests:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, [session?.sessionId]);

  const submitRequest = async (type: string, message?: string) => {
    if (!session?.sessionId) {
      setError("Session not found. Please scan the QR code again.");
      return;
    }

    setSubmitting(type);
    setError(null);

    try {
      const res = await fetch("/api/guest/assistance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.sessionId,
          type,
          message: message || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit request");
        return;
      }

      // Add to active requests
      setActiveRequests((prev) => [data.request, ...prev]);
      setSuccessMessage(`${ASSISTANCE_TYPES.find(t => t.type === type)?.label || "Assistance"} request sent!`);
      setSelectedType(null);
      setCustomMessage("");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Failed to submit request. Please try again.");
    } finally {
      setSubmitting(null);
    }
  };

  const cancelRequest = async (id: string) => {
    if (!session?.sessionId) return;

    try {
      const res = await fetch(`/api/guest/assistance/${id}?sessionId=${session.sessionId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setActiveRequests((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error("Error cancelling request:", err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
            <Clock className="h-3 w-3" />
            Waiting
          </span>
        );
      case "NOTIFIED":
        return (
          <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
            <Clock className="h-3 w-3" />
            Staff Notified
          </span>
        );
      case "ACKNOWLEDGED":
        return (
          <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
            <CheckCircle className="h-3 w-3" />
            On the way
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
            <Loader2 className="h-3 w-3 animate-spin" />
            Being handled
          </span>
        );
      default:
        return null;
    }
  };

  const hasActiveRequestOfType = (type: string) => {
    return activeRequests.some((r) => r.type === type);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b z-10">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/m/${restaurantSlug}/${tableId}/menu`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Need Assistance?</h1>
            <p className="text-sm text-muted-foreground">
              Table {session?.tableNumber}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Active Requests */}
        {activeRequests.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Active Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeRequests.map((request) => {
                const typeInfo = ASSISTANCE_TYPES.find((t) => t.type === request.type);
                const IconComponent = typeInfo?.icon || HelpCircle;

                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${typeInfo?.bgColor || "bg-gray-50"}`}>
                        <IconComponent className={`h-5 w-5 ${typeInfo?.color || "text-gray-500"}`} />
                      </div>
                      <div>
                        <p className="font-medium">{typeInfo?.label || request.type}</p>
                        {request.message && (
                          <p className="text-xs text-muted-foreground">{request.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(request.status)}
                      {["PENDING", "NOTIFIED"].includes(request.status) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => cancelRequest(request.id)}
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Assistance Options */}
        <div>
          <h2 className="text-lg font-semibold mb-3">How can we help?</h2>
          <div className="grid grid-cols-2 gap-3">
            {ASSISTANCE_TYPES.map((type) => {
              const IconComponent = type.icon;
              const isActive = hasActiveRequestOfType(type.type);
              const isSubmitting = submitting === type.type;

              return (
                <Card
                  key={type.type}
                  className={`cursor-pointer transition-all ${
                    isActive
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:shadow-md hover:border-primary/50"
                  }`}
                  onClick={() => {
                    if (isActive || isSubmitting) return;
                    if (type.type === "OTHER" || type.type === "FOOD_ISSUE") {
                      setSelectedType(type.type);
                    } else {
                      submitRequest(type.type);
                    }
                  }}
                >
                  <CardContent className="p-4 text-center">
                    <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${type.bgColor}`}>
                      {isSubmitting ? (
                        <Loader2 className={`h-6 w-6 animate-spin ${type.color}`} />
                      ) : (
                        <IconComponent className={`h-6 w-6 ${type.color}`} />
                      )}
                    </div>
                    <h3 className="font-medium text-sm">{type.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isActive ? "Request pending" : type.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Custom Message Modal */}
        {selectedType && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-end"
            onClick={() => {
              setSelectedType(null);
              setCustomMessage("");
            }}
          >
            <div
              className="bg-background w-full rounded-t-2xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2">
                {ASSISTANCE_TYPES.find((t) => t.type === selectedType)?.label}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Please provide more details (optional)
              </p>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Describe your request..."
                className="w-full p-3 border rounded-lg resize-none h-24"
              />
              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedType(null);
                    setCustomMessage("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => submitRequest(selectedType, customMessage)}
                  disabled={submitting === selectedType}
                >
                  {submitting === selectedType ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Request"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-center text-sm text-muted-foreground mt-8">
          <p>Your waiter will be notified immediately</p>
          <p className="text-xs mt-1">Average response time: 2-3 minutes</p>
        </div>
      </div>
    </div>
  );
}
