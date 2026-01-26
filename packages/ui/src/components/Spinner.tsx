"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = "md", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-center", className)}
        {...props}
      >
        <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      </div>
    );
  }
);
Spinner.displayName = "Spinner";

// Full page loading spinner
export interface PageSpinnerProps {
  message?: string;
}

const PageSpinner: React.FC<PageSpinnerProps> = ({ message }) => {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      <Spinner size="xl" />
      {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
    </div>
  );
};

export { Spinner, PageSpinner };
