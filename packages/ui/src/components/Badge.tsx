"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        success: "border-transparent bg-green-100 text-green-800",
        warning: "border-transparent bg-yellow-100 text-yellow-800",
        info: "border-transparent bg-blue-100 text-blue-800",
        // Status badges
        available: "border-transparent bg-green-100 text-green-800",
        occupied: "border-transparent bg-red-100 text-red-800",
        reserved: "border-transparent bg-blue-100 text-blue-800",
        cleaning: "border-transparent bg-yellow-100 text-yellow-800",
        blocked: "border-transparent bg-gray-100 text-gray-800",
        // Order status
        pending: "border-transparent bg-yellow-100 text-yellow-800",
        confirmed: "border-transparent bg-blue-100 text-blue-800",
        preparing: "border-transparent bg-purple-100 text-purple-800",
        ready: "border-transparent bg-green-100 text-green-800",
        served: "border-transparent bg-green-100 text-green-800",
        completed: "border-transparent bg-gray-100 text-gray-800",
        cancelled: "border-transparent bg-red-100 text-red-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
