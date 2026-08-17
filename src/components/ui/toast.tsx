"use client";

import * as RadixToast from "@radix-ui/react-toast";
import * as React from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

export type ToastVariant = "neutral" | "pass" | "fail" | "partial" | "ai";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener(toasts);
}

/**
 * Imperative toast trigger, usable from anywhere (event handlers, mutation
 * callbacks) without threading a hook through the component tree. Backed by
 * Radix Toast for the actual live-region/dismissal behavior.
 */
export function toast(input: Omit<ToastItem, "id">) {
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, ...input }];
  emit();
  return id;
}

function dismiss(id: string) {
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

function useToastList() {
  const [state, setState] = React.useState(toasts);
  React.useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);
  return state;
}

const variantIcon: Record<ToastVariant, IconName> = {
  neutral: "info",
  pass: "approved",
  fail: "fail",
  partial: "partial",
  ai: "claude",
};

const variantColor: Record<ToastVariant, string> = {
  neutral: "text-foreground-muted",
  pass: "text-pass",
  fail: "text-fail",
  partial: "text-partial",
  ai: "text-ai",
};

export function Toaster() {
  const items = useToastList();

  return (
    <RadixToast.Provider swipeDirection="right" duration={5000}>
      {items.map((item) => {
        const variant = item.variant ?? "neutral";
        return (
          <RadixToast.Root
            key={item.id}
            onOpenChange={(open) => {
              if (!open) dismiss(item.id);
            }}
            className={cn(
              "flex items-start gap-3 rounded-md border border-subtle bg-raised p-4 shadow-md",
              "transition-base data-[state=closed]:opacity-0",
            )}
          >
            <Icon name={variantIcon[variant]} className={cn("mt-0.5 shrink-0", variantColor[variant])} size={18} />
            <div className="flex flex-col gap-0.5">
              <RadixToast.Title className="text-body font-medium text-foreground">
                {item.title}
              </RadixToast.Title>
              {item.description ? (
                <RadixToast.Description className="text-body-sm text-foreground-muted">
                  {item.description}
                </RadixToast.Description>
              ) : null}
            </div>
            <RadixToast.Close
              aria-label="Dismiss notification"
              className="ml-auto text-foreground-muted transition-fast hover:text-foreground"
            >
              <Icon name="close" size={16} />
            </RadixToast.Close>
          </RadixToast.Root>
        );
      })}
      <RadixToast.Viewport className="fixed bottom-0 right-0 z-50 flex w-full max-w-sm flex-col gap-2.5 p-6" />
    </RadixToast.Provider>
  );
}
