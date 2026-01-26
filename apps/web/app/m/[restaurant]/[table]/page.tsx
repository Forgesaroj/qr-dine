"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge } from "@qr-dine/ui";
import { QrCode, Loader2, AlertCircle, UtensilsCrossed, Gift, Star, User, LogIn, X, ChevronRight } from "lucide-react";
import { useGuest } from "./GuestContext";

interface TableInfo {
  id: string;
  tableNumber: string;
  name: string | null;
  restaurant: {
    name: string;
    slug: string;
  };
}

export default function GuestLandingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, setSession, loyalty, setLoyaltyCustomer } = useGuest();

  const restaurantSlug = params.restaurant as string;
  const tableId = params.table as string;
  const isPreviewMode = searchParams.get("preview") === "staff";

  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState(["", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Loyalty registration/login state
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [loyaltyMode, setLoyaltyMode] = useState<"register" | "login">("register");
  const [loyaltyForm, setLoyaltyForm] = useState({
    name: "",
    phone: "",
    dateOfBirth: "",
    email: "",
    marketingConsent: true,
  });
  const [loginPhone, setLoginPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // If already verified or in preview mode, redirect to menu
  useEffect(() => {
    if (isPreviewMode) {
      router.push(`/m/${restaurantSlug}/${tableId}/menu?preview=staff`);
      return;
    }
    if (session?.verified) {
      router.push(`/m/${restaurantSlug}/${tableId}/menu`);
    }
  }, [session, router, restaurantSlug, tableId, isPreviewMode]);

  // Fetch table info
  useEffect(() => {
    const fetchTableInfo = async () => {
      try {
        const res = await fetch(`/api/guest/table?restaurant=${restaurantSlug}&table=${tableId}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Table not found");
          return;
        }

        setTableInfo(data.table);
      } catch (err) {
        setError("Failed to load table information");
      } finally {
        setLoading(false);
      }
    };

    fetchTableInfo();
  }, [restaurantSlug, tableId]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only digits

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only last digit
    setOtp(newOtp);
    setOtpError(null);

    // Auto-focus next input
    if (value && index < 2) {
      inputRefs[index + 1]?.current?.focus();
    }

    // Auto-submit when all digits are filled
    if (value && index === 2) {
      // Check if all digits are now filled
      const allFilled = newOtp.every((d) => d !== "");
      if (allFilled) {
        // Delay slightly to show the last digit being entered
        setTimeout(() => {
          verifyOtpAuto(newOtp.join(""));
        }, 100);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs[index - 1]?.current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 3);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i] ?? "";
    }
    setOtp(newOtp);
    setOtpError(null);

    // Focus last filled input
    const lastIndex = Math.min(pastedData.length - 1, 2);
    inputRefs[lastIndex]?.current?.focus();

    // Auto-submit if all 3 digits are pasted
    if (pastedData.length === 3) {
      setTimeout(() => {
        verifyOtpAuto(pastedData);
      }, 100);
    }
  };

  // Auto-verify function that takes OTP code directly (for auto-submit)
  const verifyOtpAuto = async (otpCode: string) => {
    if (verifying) return; // Prevent double submission

    setVerifying(true);
    setOtpError(null);

    try {
      const res = await fetch("/api/guest/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant: restaurantSlug,
          table: tableId,
          otp: otpCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error || "Invalid OTP");
        return;
      }

      // Set session and redirect
      setSession({
        sessionId: data.sessionId,
        verified: true,
        tableNumber: tableInfo?.tableNumber || "",
        restaurantName: tableInfo?.restaurant.name || "",
        restaurantSlug,
      });

      router.push(`/m/${restaurantSlug}/${tableId}/menu`);
    } catch (err) {
      setOtpError("Failed to verify OTP. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  // Manual verify function (for button click)
  const verifyOtp = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 3) {
      setOtpError("Please enter the complete 3-digit OTP");
      return;
    }
    await verifyOtpAuto(otpCode);
  };

  // Loyalty registration handler
  const handleLoyaltyRegister = async () => {
    if (!loyaltyForm.name || !loyaltyForm.phone || !loyaltyForm.dateOfBirth) {
      setLoyaltyError("Please fill in all required fields");
      return;
    }

    setLoyaltyLoading(true);
    setLoyaltyError(null);

    try {
      const res = await fetch("/api/guest/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          restaurantSlug,
          ...loyaltyForm,
          sessionId: session?.sessionId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoyaltyError(data.error || "Registration failed");
        return;
      }

      // Success - set customer and close modal
      setLoyaltyCustomer(
        {
          id: data.customer.id,
          name: data.customer.name,
          tier: data.customer.tier,
          pointsBalance: data.customer.pointsBalance,
        },
        data.token
      );
      setShowLoyaltyModal(false);
      setLoyaltyForm({
        name: "",
        phone: "",
        dateOfBirth: "",
        email: "",
        marketingConsent: true,
      });
    } catch {
      setLoyaltyError("Failed to register. Please try again.");
    } finally {
      setLoyaltyLoading(false);
    }
  };

  // Loyalty login handler
  const handleLoyaltyLogin = async () => {
    if (!loginPhone) {
      setLoyaltyError("Please enter your phone number");
      return;
    }

    setLoyaltyLoading(true);
    setLoyaltyError(null);

    try {
      const res = await fetch("/api/guest/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          restaurantSlug,
          phone: loginPhone,
          verificationCode: showVerification ? verificationCode : undefined,
          sessionId: session?.sessionId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoyaltyError(data.error || "Login failed");
        return;
      }

      if (data.requiresVerification) {
        // Show verification step
        setShowVerification(true);
        return;
      }

      // Success - set customer and close modal
      setLoyaltyCustomer(
        {
          id: data.customer.id,
          name: data.customer.name,
          tier: data.customer.tier,
          pointsBalance: data.customer.pointsBalance,
        },
        data.token
      );
      setShowLoyaltyModal(false);
      setLoginPhone("");
      setVerificationCode("");
      setShowVerification(false);
    } catch {
      setLoyaltyError("Failed to login. Please try again.");
    } finally {
      setLoyaltyLoading(false);
    }
  };

  // Reset loyalty modal state
  const closeLoyaltyModal = () => {
    setShowLoyaltyModal(false);
    setLoyaltyMode("register");
    setLoyaltyError(null);
    setShowVerification(false);
    setLoyaltyForm({
      name: "",
      phone: "",
      dateOfBirth: "",
      email: "",
      marketingConsent: true,
    });
    setLoginPhone("");
    setVerificationCode("");
  };

  // Get tier color
  const getTierColor = (tier: string) => {
    switch (tier) {
      case "PLATINUM":
        return "bg-purple-500";
      case "GOLD":
        return "bg-yellow-500";
      case "SILVER":
        return "bg-gray-400";
      default:
        return "bg-amber-600";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Oops!</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-primary/5 to-background">
      {/* Restaurant Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
          <UtensilsCrossed className="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold">{tableInfo?.restaurant.name}</h1>
        <p className="text-muted-foreground">
          Table {tableInfo?.tableNumber}
          {tableInfo?.name && ` - ${tableInfo.name}`}
        </p>
      </div>

      {/* OTP Card */}
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <QrCode className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Enter OTP</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Please enter the 3-digit code displayed on your table
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OTP Inputs */}
          <div className="flex justify-center gap-3">
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={inputRefs[index]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-14 h-14 text-center text-2xl font-bold"
                autoFocus={index === 0}
              />
            ))}
          </div>

          {/* Error Message */}
          {otpError && (
            <p className="text-sm text-destructive text-center">{otpError}</p>
          )}

          {/* Verify Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={verifyOtp}
            disabled={verifying || otp.some((d) => !d)}
          >
            {verifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "View Menu"
            )}
          </Button>

          {/* Help Text */}
          <p className="text-xs text-muted-foreground text-center">
            Can&apos;t find the OTP? Ask your waiter for assistance.
          </p>
        </CardContent>
      </Card>

      {/* Loyalty Section */}
      {loyalty.enabled && !loyalty.isChecking && (
        <div className="w-full max-w-md mt-6">
          {loyalty.customer ? (
            // Recognized customer welcome
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">नमस्ते, {loyalty.customer.name}!</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className={`${getTierColor(loyalty.customer.tier)} text-white border-0 text-xs`}>
                        {loyalty.customer.tier}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        {loyalty.customer.pointsBalance} pts
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : (
            // New customer - Join loyalty
            <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/5 border-green-500/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Gift className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-green-700">Join & Get {loyalty.welcomeBonus} Points FREE!</p>
                    <p className="text-sm text-muted-foreground">
                      Earn rewards on every visit
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setLoyaltyMode("register");
                      setShowLoyaltyModal(true);
                    }}
                  >
                    Join Now
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setLoyaltyMode("login");
                      setShowLoyaltyModal(true);
                    }}
                  >
                    <LogIn className="h-4 w-4 mr-1" />
                    I&apos;m a Member
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Loyalty Modal */}
      {showLoyaltyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-background w-full sm:max-w-md sm:rounded-lg rounded-t-xl max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold">
                {loyaltyMode === "register" ? "Join Loyalty Program" : "Member Login"}
              </h2>
              <Button variant="ghost" size="icon" onClick={closeLoyaltyModal}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-4 space-y-4">
              {loyaltyMode === "register" ? (
                // Registration Form
                <>
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                      <Gift className="h-8 w-8 text-green-600" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Get <span className="font-semibold text-green-600">{loyalty.welcomeBonus} points</span> instantly!
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Name *</label>
                      <Input
                        placeholder="Your name"
                        value={loyaltyForm.name}
                        onChange={(e) => setLoyaltyForm({ ...loyaltyForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone Number *</label>
                      <Input
                        placeholder="98XXXXXXXX"
                        type="tel"
                        value={loyaltyForm.phone}
                        onChange={(e) => setLoyaltyForm({ ...loyaltyForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Date of Birth *</label>
                      <Input
                        type="date"
                        value={loyaltyForm.dateOfBirth}
                        onChange={(e) => setLoyaltyForm({ ...loyaltyForm, dateOfBirth: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Get special rewards on your birthday!
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email (Optional)</label>
                      <Input
                        placeholder="email@example.com"
                        type="email"
                        value={loyaltyForm.email}
                        onChange={(e) => setLoyaltyForm({ ...loyaltyForm, email: e.target.value })}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={loyaltyForm.marketingConsent}
                        onChange={(e) => setLoyaltyForm({ ...loyaltyForm, marketingConsent: e.target.checked })}
                        className="rounded"
                      />
                      Receive promotional offers via SMS
                    </label>
                  </div>

                  {loyaltyError && (
                    <p className="text-sm text-destructive">{loyaltyError}</p>
                  )}

                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleLoyaltyRegister}
                    disabled={loyaltyLoading}
                  >
                    {loyaltyLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <Gift className="mr-2 h-4 w-4" />
                        Join & Get {loyalty.welcomeBonus} Points
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Already a member?{" "}
                    <button
                      className="text-primary underline"
                      onClick={() => {
                        setLoyaltyMode("login");
                        setLoyaltyError(null);
                      }}
                    >
                      Login here
                    </button>
                  </p>
                </>
              ) : (
                // Login Form
                <>
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Welcome back! Enter your phone to continue.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {!showVerification ? (
                      <div>
                        <label className="text-sm font-medium">Phone Number</label>
                        <Input
                          placeholder="98XXXXXXXX"
                          type="tel"
                          value={loginPhone}
                          onChange={(e) => setLoginPhone(e.target.value)}
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="text-sm font-medium">Enter last 4 digits of your phone</label>
                        <Input
                          placeholder="XXXX"
                          maxLength={4}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          For security, please verify with the last 4 digits
                        </p>
                      </div>
                    )}
                  </div>

                  {loyaltyError && (
                    <p className="text-sm text-destructive">{loyaltyError}</p>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleLoyaltyLogin}
                    disabled={loyaltyLoading}
                  >
                    {loyaltyLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {showVerification ? "Verifying..." : "Checking..."}
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        {showVerification ? "Verify & Login" : "Continue"}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Not a member yet?{" "}
                    <button
                      className="text-primary underline"
                      onClick={() => {
                        setLoyaltyMode("register");
                        setLoyaltyError(null);
                        setShowVerification(false);
                      }}
                    >
                      Register now
                    </button>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
