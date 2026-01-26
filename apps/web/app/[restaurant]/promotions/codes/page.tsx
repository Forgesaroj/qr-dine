"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  ArrowLeft,
  Loader2,
  Tag,
  Copy,
  Download,
  Sparkles,
  Check,
} from "lucide-react";

export default function PromoCodesPage() {
  const params = useParams();
  const router = useRouter();
  const restaurant = params.restaurant as string;

  const [loading, setLoading] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    codePrefix: "",
    codeLength: 8,
    quantity: 1,
    discountType: "PERCENTAGE",
    discountValue: 10,
    maxDiscount: "",
    minOrderAmount: "",
    startDate: "",
    endDate: "",
    usesPerCode: 1,
    perCustomerLimit: 1,
    status: "DRAFT",
  });

  const generateCode = (prefix: string, length: number): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = prefix ? prefix.toUpperCase() : "";
    const remainingLength = length - code.length;
    for (let i = 0; i < remainingLength; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const generatePreview = () => {
    const codes: string[] = [];
    for (let i = 0; i < Math.min(form.quantity, 10); i++) {
      codes.push(generateCode(form.codePrefix, form.codeLength));
    }
    setGeneratedCodes(codes);
  };

  useEffect(() => {
    if (form.codeLength >= 4) {
      generatePreview();
    }
  }, [form.codePrefix, form.codeLength, form.quantity]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyAllCodes = () => {
    navigator.clipboard.writeText(generatedCodes.join("\n"));
    setCopiedCode("all");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const downloadCodes = () => {
    const content = generatedCodes.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promo-codes-${form.name || "export"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      // Create promotions for each code
      const promises = generatedCodes.map((code) =>
        fetch("/api/promotions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${form.name} - ${code}`,
            description: form.description,
            type: "PROMO_CODE",
            promoCode: code,
            discountType: form.discountType,
            discountValue: parseFloat(form.discountValue.toString()),
            maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
            minOrderAmount: form.minOrderAmount
              ? parseFloat(form.minOrderAmount)
              : null,
            startDate: form.startDate || null,
            endDate: form.endDate || null,
            totalUsesLimit: form.usesPerCode,
            perCustomerLimit: form.perCustomerLimit,
            status: form.status,
            appliesTo: "ALL",
          }),
        })
      );

      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.ok).length;

      if (failed > 0) {
        alert(`${generatedCodes.length - failed} codes created. ${failed} failed.`);
      } else {
        router.push(`/${restaurant}/promotions`);
      }
    } catch (error: any) {
      console.error("Error creating promo codes:", error);
      alert(error.message || "Failed to create promo codes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${restaurant}/promotions`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Generate Promo Codes</h1>
          <p className="text-muted-foreground">
            Create unique promotional codes for customers
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Code Generation Settings */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Code Settings</CardTitle>
                <CardDescription>Configure how codes are generated</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Campaign Name *</label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Holiday Sale 2024"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Internal description..."
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Code Prefix</label>
                    <Input
                      value={form.codePrefix}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          codePrefix: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="e.g., SAVE"
                      maxLength={4}
                      className="uppercase"
                    />
                    <p className="text-xs text-muted-foreground">Max 4 characters</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Code Length</label>
                    <Input
                      type="number"
                      value={form.codeLength}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          codeLength: parseInt(e.target.value) || 8,
                        }))
                      }
                      min={6}
                      max={16}
                    />
                    <p className="text-xs text-muted-foreground">6-16 characters</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Number of Codes</label>
                  <Input
                    type="number"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        quantity: parseInt(e.target.value) || 1,
                      }))
                    }
                    min={1}
                    max={100}
                  />
                  <p className="text-xs text-muted-foreground">Max 100 codes per batch</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Discount Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Discount Type</label>
                    <select
                      value={form.discountType}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, discountType: e.target.value }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                    >
                      <option value="PERCENTAGE">Percentage Off</option>
                      <option value="FIXED">Fixed Amount Off</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Discount Value{" "}
                      {form.discountType === "PERCENTAGE" ? "(%)" : "(Rs.)"}
                    </label>
                    <Input
                      type="number"
                      value={form.discountValue}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          discountValue: parseFloat(e.target.value) || 0,
                        }))
                      }
                      min={0}
                      max={form.discountType === "PERCENTAGE" ? 100 : undefined}
                    />
                  </div>
                </div>
                {form.discountType === "PERCENTAGE" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Discount (Rs.)</label>
                    <Input
                      type="number"
                      value={form.maxDiscount}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, maxDiscount: e.target.value }))
                      }
                      placeholder="No limit"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Order Amount (Rs.)</label>
                  <Input
                    type="number"
                    value={form.minOrderAmount}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, minOrderAmount: e.target.value }))
                    }
                    placeholder="No minimum"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview & Limits */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Generated Codes Preview
                </CardTitle>
                <CardDescription>
                  {form.quantity > 10
                    ? `Showing first 10 of ${form.quantity} codes`
                    : `${generatedCodes.length} codes`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {generatedCodes.map((code, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg font-mono"
                    >
                      <span className="text-lg">{code}</span>
                      <button
                        type="button"
                        onClick={() => copyCode(code)}
                        className="p-2 hover:bg-muted rounded"
                      >
                        {copiedCode === code ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generatePreview}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyAllCodes}
                  >
                    {copiedCode === "all" ? (
                      <Check className="h-4 w-4 mr-2 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    Copy All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadCodes}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage Limits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Uses Per Code</label>
                    <Input
                      type="number"
                      value={form.usesPerCode}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          usesPerCode: parseInt(e.target.value) || 1,
                        }))
                      }
                      min={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      How many times each code can be used
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Per Customer</label>
                    <Input
                      type="number"
                      value={form.perCustomerLimit}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          perCustomerLimit: parseInt(e.target.value) || 1,
                        }))
                      }
                      min={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Uses per customer per code
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Validity Period</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={form.endDate}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status: e.target.value }))
                }
                className="px-3 py-2 border rounded-lg bg-background"
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="SCHEDULED">Scheduled</option>
              </select>
              <div className="flex gap-3">
                <Link href={`/${restaurant}/promotions`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create {form.quantity} Code{form.quantity > 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
