"use client";

import * as RadixPopover from "@radix-ui/react-popover";
import * as React from "react";

import { fieldStyles } from "@/components/ui/field-styles";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

export type ComboboxOption = {
  value: string;
  label: string;
};

export type ComboboxProps = {
  label: string;
  description?: string;
  error?: string;
  hideLabel?: boolean;
  placeholder?: string;
  options: readonly ComboboxOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  emptyMessage?: string;
  disabled?: boolean;
  id?: string;
};

/**
 * A minimal accessible combobox: text input filters a listbox, arrow keys
 * move a roving highlight, Enter commits it. Built on Radix Popover for
 * positioning/dismissal since Radix has no combobox primitive of its own.
 */
export function Combobox({
  id,
  label,
  description,
  error,
  hideLabel,
  placeholder = "Search…",
  options,
  value,
  onValueChange,
  emptyMessage = "No matches",
  disabled,
}: ComboboxProps) {
  const generatedId = React.useId();
  const comboboxId = id ?? generatedId;
  const listboxId = `${comboboxId}-listbox`;
  const descriptionId = description ? `${comboboxId}-description` : undefined;
  const errorId = error ? `${comboboxId}-error` : undefined;

  const selectedOption = options.find((option) => option.value === value) ?? null;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(selectedOption?.label ?? "");
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Derived, not synced via effect: while closed the field always shows the
  // committed selection; `query` only matters as the live filter text while
  // open, and is reseeded from the selection each time the field opens.
  const displayValue = open ? query : selectedOption?.label ?? "";

  const filteredOptions = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized || (selectedOption && query === selectedOption.label)) {
      return options;
    }
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalized),
    );
  }, [options, query, selectedOption]);

  function commit(option: ComboboxOption | undefined) {
    if (!option) return;
    onValueChange(option.value);
    setQuery(option.label);
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((index) =>
        filteredOptions.length ? (index + 1) % filteredOptions.length : 0,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((index) =>
        filteredOptions.length
          ? (index - 1 + filteredOptions.length) % filteredOptions.length
          : 0,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      commit(filteredOptions[highlightedIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={comboboxId}
        className={cn("text-label-style text-foreground-secondary", hideLabel && "sr-only")}
      >
        {label}
      </label>
      {description ? (
        <p id={descriptionId} className="text-body-sm text-foreground-muted">
          {description}
        </p>
      ) : null}
      <RadixPopover.Root open={open && filteredOptions.length > 0} onOpenChange={setOpen}>
        <RadixPopover.Anchor asChild>
          <div className="relative">
            <input
              ref={inputRef}
              id={comboboxId}
              role="combobox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={
                open && filteredOptions[highlightedIndex]
                  ? `${listboxId}-${filteredOptions[highlightedIndex].value}`
                  : undefined
              }
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={cn(descriptionId, errorId) || undefined}
              className={cn(
                fieldStyles({ state: error ? "invalid" : "default" }),
                "pr-9",
              )}
              placeholder={placeholder}
              value={displayValue}
              disabled={disabled}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlightedIndex(0);
                setOpen(true);
              }}
              onFocus={() => {
                setQuery(selectedOption?.label ?? "");
                setOpen(true);
              }}
              onKeyDown={handleKeyDown}
              onBlur={() => setOpen(false)}
            />
            <Icon
              name="chevronDown"
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted"
            />
          </div>
        </RadixPopover.Anchor>
        <RadixPopover.Portal>
          <RadixPopover.Content
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
            className="z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-md border border-subtle bg-raised shadow-md"
            sideOffset={4}
          >
            <ul id={listboxId} role="listbox" className="max-h-64 overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <li className="px-2.5 py-2 text-body-sm text-foreground-muted">
                  {emptyMessage}
                </li>
              ) : (
                filteredOptions.map((option, index) => (
                  <li
                    key={option.value}
                    id={`${listboxId}-${option.value}`}
                    role="option"
                    aria-selected={option.value === value}
                    className={cn(
                      "cursor-pointer rounded-xs px-2.5 py-2 text-body text-foreground",
                      index === highlightedIndex && "bg-inset",
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => commit(option)}
                  >
                    {option.label}
                  </li>
                ))
              )}
            </ul>
          </RadixPopover.Content>
        </RadixPopover.Portal>
      </RadixPopover.Root>
      {error ? (
        <p id={errorId} role="alert" className="text-body-sm text-fail">
          {error}
        </p>
      ) : null}
    </div>
  );
}
