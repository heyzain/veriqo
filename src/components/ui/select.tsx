"use client";

import * as RadixSelect from "@radix-ui/react-select";
import * as React from "react";

import { fieldStyles } from "@/components/ui/field-styles";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps = {
  label: string;
  description?: string;
  error?: string;
  hideLabel?: boolean;
  placeholder?: string;
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  id?: string;
};

export function Select({
  id,
  label,
  description,
  error,
  hideLabel,
  placeholder = "Select…",
  options,
  disabled,
  required,
  ...props
}: SelectProps) {
  const generatedId = React.useId();
  const selectId = id ?? generatedId;
  const descriptionId = description ? `${selectId}-description` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={selectId}
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
      <RadixSelect.Root disabled={disabled} {...props}>
        <RadixSelect.Trigger
          id={selectId}
          className={cn(
            fieldStyles({ state: error ? "invalid" : "default" }),
            "flex items-center justify-between gap-2 text-left",
          )}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={cn(descriptionId, errorId) || undefined}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <Icon name="chevronDown" size={16} className="text-foreground-muted" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            className="z-50 overflow-hidden rounded-md border border-subtle bg-raised shadow-md"
            position="popper"
            sideOffset={4}
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-xs px-2.5 py-2 text-body text-foreground outline-none",
                    "data-[highlighted]:bg-inset",
                    "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60",
                  )}
                >
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator>
                    <Icon name="check" size={14} className="text-action" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {error ? (
        <p id={errorId} role="alert" className="text-body-sm text-fail">
          {error}
        </p>
      ) : null}
    </div>
  );
}
