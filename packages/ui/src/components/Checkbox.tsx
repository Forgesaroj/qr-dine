"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  description?: string;
  onChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, onChange, checked, id, ...props }, ref) => {
    const checkboxId = id || React.useId();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.checked);
    };

    return (
      <div className="flex items-start">
        <div className="flex h-5 items-center">
          <div className="relative">
            <input
              type="checkbox"
              id={checkboxId}
              className="peer sr-only"
              ref={ref}
              checked={checked}
              onChange={handleChange}
              {...props}
            />
            <div
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary ring-offset-background peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
                checked && "bg-primary text-primary-foreground",
                className
              )}
            >
              {checked && <Check className="h-3 w-3" />}
            </div>
          </div>
        </div>
        {(label || description) && (
          <div className="ml-3">
            {label && (
              <label
                htmlFor={checkboxId}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
