"use client";

import * as React from "react";

import { fieldStyles } from "@/components/ui/field-styles";
import { cn } from "@/lib/utils/cn";

type FieldChrome = {
  label: string;
  description?: string;
  error?: string;
  hideLabel?: boolean;
  containerClassName?: string;
};

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> &
  FieldChrome & { size?: "sm" | "md" };

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      label,
      description,
      error,
      hideLabel,
      containerClassName,
      className,
      size = "md",
      required,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const descriptionId = description ? `${inputId}-description` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        <label
          htmlFor={inputId}
          className={cn(
            "text-label-style text-foreground-secondary",
            hideLabel && "sr-only",
          )}
        >
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </label>
        {description ? (
          <p id={descriptionId} className="text-body-sm text-foreground-muted">
            {description}
          </p>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(fieldStyles({ state: error ? "invalid" : "default", size }), className)}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={cn(descriptionId, errorId) || undefined}
          required={required}
          {...props}
        />
        {error ? (
          <p id={errorId} role="alert" className="text-body-sm text-fail">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  FieldChrome;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      id,
      label,
      description,
      error,
      hideLabel,
      containerClassName,
      className,
      required,
      rows = 4,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const textareaId = id ?? generatedId;
    const descriptionId = description ? `${textareaId}-description` : undefined;
    const errorId = error ? `${textareaId}-error` : undefined;

    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        <label
          htmlFor={textareaId}
          className={cn(
            "text-label-style text-foreground-secondary",
            hideLabel && "sr-only",
          )}
        >
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </label>
        {description ? (
          <p id={descriptionId} className="text-body-sm text-foreground-muted">
            {description}
          </p>
        ) : null}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={cn(
            fieldStyles({ state: error ? "invalid" : "default" }),
            "h-auto resize-y py-2 leading-[var(--text-body--line-height)]",
            className,
          )}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={cn(descriptionId, errorId) || undefined}
          required={required}
          {...props}
        />
        {error ? (
          <p id={errorId} role="alert" className="text-body-sm text-fail">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
