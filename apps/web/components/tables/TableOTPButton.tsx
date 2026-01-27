"use client";

import { useState } from "react";
import { Button } from "@qr-dine/ui";
import { KeyRound, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface TableOTPButtonProps {
  tableId: string;
  currentOtp: string | null;
  otpGeneratedAt: Date | null;
}

export function TableOTPButton({
  tableId,
  currentOtp,
}: TableOTPButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const generateOTP = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tables/${tableId}/otp`, {
        method: "POST",
      });

      if (res.ok) {
        // Refresh the page to show updated OTP in header
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to generate OTP:", err);
    } finally {
      setLoading(false);
    }
  };

  // If no OTP exists, show Generate button
  if (!currentOtp) {
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

  // If OTP exists, only show regenerate button (OTP is displayed in card header)
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={generateOTP}
      disabled={loading}
      className="w-full text-xs"
    >
      {loading ? (
        <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
      ) : (
        <RefreshCw className="mr-2 h-3 w-3" />
      )}
      Regenerate OTP
    </Button>
  );
}
