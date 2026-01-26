"use client";

import * as React from "react";

import { cn } from "../lib/utils";

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  description?: string;
  onChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, onChange, checked, id, ...props }, ref) => {
    const switchId = id || React.useId();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.checked);
    };

    return (
      <div className="flex items-center justify-between">
        {(label || description) && (
          <div className="space-y-0.5">
            {label && (
              <label
                htmlFor={switchId}
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
        <div className="relative">
          <input
            type="checkbox"
            id={switchId}
            role="switch"
            aria-checked={checked}
            className="peer sr-only"
            ref={ref}
            checked={checked}
            onChange={handleChange}
            {...props}
          />
          <div
            className={cn(
              "h-6 w-11 cursor-pointer rounded-full border-2 border-transparent bg-input transition-colors peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
              checked && "bg-primary",
              className
            )}
          >
            <div
              className={cn(
                "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
                checked ? "translate-x-5" : "translate-x-0"
              )}
            />
          </div>
        </div>
      </div>
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
