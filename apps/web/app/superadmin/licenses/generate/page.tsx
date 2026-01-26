"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
} from "@qr-dine/ui";
import { ArrowLeft, Loader2, Key, Copy, Check } from "lucide-react";

const TIERS = [
  { value: "STARTER", label: "Starter", description: "Basic features for small restaurants" },
  { value: "PROFESSIONAL", label: "Professional", description: "Advanced features for growing businesses" },
  { value: "ENTERPRISE", label: "Enterprise", description: "Full features for large operations" },
  { value: "UNLIMITED", label: "Unlimited", description: "All features, no limits" },
];

const VALIDITY_OPTIONS = [
  { value: 1, label: "1 Month" },
  { value: 3, label: "3 Months" },
  { value: 6, label: "6 Months" },
  { value: 12, label: "1 Year" },
  { value: 24, label: "2 Years" },
];

export default function GenerateLicensePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    tier: "PROFESSIONAL",
    validityMonths: 12,
    quantity: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setGeneratedKeys([]);

    try {
      const res = await fetch("/api/superadmin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate license");
        setLoading(false);
        return;
      }

      setGeneratedKeys(data.licenses.map((l: { key: string }) => l.key));
      setLoading(false);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const copyToClipboard = async (key: string, index: number) => {
    await navigator.clipboard.writeText(key);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/superadmin/licenses">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Generate License Keys</h1>
          <p className="text-muted-foreground">
            Create new license keys for restaurants
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              License Configuration
            </CardTitle>
            <CardDescription>
              Configure the license tier and validity period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">License Tier</label>
                <div className="grid gap-2">
                  {TIERS.map((tier) => (
                    <label
                      key={tier.value}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.tier === tier.value
                          ? "border-orange-500 bg-orange-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="tier"
                        value={tier.value}
                        checked={formData.tier === tier.value}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, tier: e.target.value }))
                        }
                        className="mr-3"
                      />
                      <div>
                        <p className="font-medium">{tier.label}</p>
                        <p className="text-sm text-muted-foreground">{tier.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Validity Period</label>
                <select
                  value={formData.validityMonths}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      validityMonths: parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {VALIDITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                type="number"
                label="Quantity"
                min={1}
                max={10}
                value={formData.quantity}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    quantity: parseInt(e.target.value) || 1,
                  }))
                }
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Generate License Keys
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {generatedKeys.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Generated Keys</CardTitle>
              <CardDescription>
                Copy these keys and share them with the restaurant owners
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {generatedKeys.map((key, index) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg font-mono text-sm"
                  >
                    <span className="flex-1 truncate">{key}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(key, index)}
                    >
                      {copiedIndex === index ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setGeneratedKeys([]);
                    setFormData((prev) => ({ ...prev, quantity: 1 }));
                  }}
                >
                  Generate More
                </Button>
                <Link href="/superadmin/licenses" className="flex-1">
                  <Button className="w-full">View All Licenses</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
