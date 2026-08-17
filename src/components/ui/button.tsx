"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

const buttonStyles = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-sm font-medium",
    "transition-fast select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
    "disabled:cursor-not-allowed disabled:opacity-60",
  ],
  {
    variants: {
      intent: {
        primary: "bg-action text-foreground-on-dark hover:bg-action-hover",
        secondary:
          "border border-strong bg-transparent text-foreground hover:bg-inset",
        ghost: "bg-transparent text-foreground hover:bg-inset",
        danger: "bg-fail text-foreground-on-dark hover:brightness-95",
      },
      size: {
        sm: "h-9 px-3 text-body-sm",
        md: "h-10 px-4 text-body",
        lg: "h-11 px-5 text-body-lg",
      },
    },
    defaultVariants: {
      intent: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles> & {
    asChild?: boolean;
    loading?: boolean;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, intent, size, asChild, loading, disabled, children, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(buttonStyles({ intent, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          // Slot requires exactly one element child to merge props onto —
          // no extra loading icon can be injected alongside it here.
          children
        ) : (
          <>
            {loading ? <Icon name="spinner" className="animate-spin" size={16} /> : null}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export type IconButtonProps = Omit<ButtonProps, "size" | "children"> & {
  icon: IconName;
  label: string;
  size?: "sm" | "md" | "lg";
};

const iconButtonSizes = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
  lg: "h-11 w-11",
} as const;

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, intent, size = "md", icon, label, loading, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          buttonStyles({ intent, size: undefined }),
          iconButtonSizes[size],
          "px-0",
          className,
        )}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-label={label}
        title={label}
        {...props}
      >
        <Icon name={loading ? "spinner" : icon} className={loading ? "animate-spin" : undefined} size={18} />
      </button>
    );
  },
);
IconButton.displayName = "IconButton";
