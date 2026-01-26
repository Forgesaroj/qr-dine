"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@qr-dine/ui";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function PinLoginPage() {
  const [pin, setPin] = useState(["", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pinCode = pin.join("");
    if (pinCode.length !== 4) return;

    setIsLoading(true);

    // TODO: Implement actual PIN login logic in Step 6
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsLoading(false);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="space-y-1">
        <Link
          href="/login"
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to login
        </Link>
        <CardTitle className="text-2xl font-bold">Quick Staff Login</CardTitle>
        <CardDescription>Enter your 4-digit PIN to access your dashboard</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-3">
            {pin.map((digit, index) => (
              <input
                key={index}
                id={`pin-${index}`}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="h-14 w-14 rounded-lg border-2 border-input bg-background text-center text-2xl font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus={index === 0}
              />
            ))}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || pin.join("").length !== 4}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Login"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Forgot your PIN?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Use email login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
