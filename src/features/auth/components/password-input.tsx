"use client";

import * as React from "react";

import { IconButton } from "@/components/ui/button";
import { fieldStyles } from "@/components/ui/field-styles";
import { cn } from "@/lib/utils/cn";

export type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size" | "type"
> & {
  label: string;
  description?: string;
  error?: string;
  hideLabel?: boolean;
  containerClassName?: string;
};

/**
 * A password field with a visibility toggle, built the same way `Input`
 * builds its own chrome (label/description/error around a `fieldStyles`
 * control) rather than layering on top of `Input` — that keeps the toggle
 * button a real flex sibling of the `<input>` in one row, so it's correctly
 * positioned regardless of whether a description or error is present.
 * Secret values are masked by default (03-CLAUDE-RULES.md, "Forms").
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    { id, label, description, error, hideLabel, containerClassName, className, required, ...props },
    ref,
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const descriptionId = description ? `${inputId}-description` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const [visible, setVisible] = React.useState(false);

    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        <label
          htmlFor={inputId}
          className={cn("text-label-style text-foreground-secondary", hideLabel && "sr-only")}
        >
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </label>
        {description ? (
          <p id={descriptionId} className="text-body-sm text-foreground-muted">
            {description}
          </p>
        ) : null}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            className={cn(fieldStyles({ state: error ? "invalid" : "default" }), "pr-11", className)}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={cn(descriptionId, errorId) || undefined}
            required={required}
            {...props}
          />
          <IconButton
            type="button"
            icon={visible ? "eyeOff" : "eye"}
            label={visible ? "Hide password" : "Show password"}
            intent="ghost"
            size="sm"
            className="absolute right-0.5 top-1/2 -translate-y-1/2"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
          />
        </div>
        {error ? (
          <p id={errorId} role="alert" className="text-body-sm text-fail">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
