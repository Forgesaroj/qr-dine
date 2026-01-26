"use client";

import { useState } from "react";
import { Button } from "@qr-dine/ui";
import { KeyRound, RefreshCw, Copy, Check } from "lucide-react";

interface TableOTPButtonProps {
  tableId: string;
  currentOtp: string | null;
  otpGeneratedAt: Date | null;
}

export function TableOTPButton({
  tableId,
  currentOtp,
}: TableOTPButtonProps) {
  const [otp, setOtp] = useState(currentOtp);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateOTP = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tables/${tableId}/otp`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        setOtp(data.otp);
      }
    } catch (err) {
      console.error("Failed to generate OTP:", err);
    } finally {
      setLoading(false);
    }
  };

  const copyOTP = () => {
    if (otp) {
      navigator.clipboard.writeText(otp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!otp) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={generateOTP}
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <KeyRound className="mr-2 h-4 w-4" />
        )}
        Generate OTP
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 text-center py-2 px-3 rounded-md font-mono text-lg font-bold tracking-widest bg-green-50 text-green-700 border border-green-200">
          {otp}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={copyOTP}
          className="h-10 w-10"
          title="Copy OTP"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Valid until regenerated
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={generateOTP}
          disabled={loading}
          className="h-7 text-xs"
        >
          {loading ? (
            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-3 w-3" />
          )}
          New OTP
        </Button>
      </div>
    </div>
  );
}
