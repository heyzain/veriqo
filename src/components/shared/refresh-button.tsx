"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

export type RefreshButtonProps = {
  label?: string;
  size?: "sm" | "md";
  variant?: "button" | "icon";
  intent?: "primary" | "secondary" | "ghost";
  className?: string;
  showToast?: boolean;
  onRefresh?: () => void | Promise<void>;
};

export function RefreshButton({
  label = "Refresh",
  size = "sm",
  variant = "button",
  intent = "secondary",
  className,
  showToast = true,
  onRefresh,
}: RefreshButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSpinning, setIsSpinning] = useState(false);

  const handleRefresh = async () => {
    setIsSpinning(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      startTransition(() => {
        router.refresh();
      });
      window.setTimeout(() => {
        setIsSpinning(false);
        if (showToast) {
          toast({ title: "Data refreshed", variant: "neutral" });
        }
      }, 500);
    } catch {
      setIsSpinning(false);
      if (showToast) {
        toast({ title: "Failed to refresh data", variant: "fail" });
      }
    }
  };

  const spinning = isPending || isSpinning;

  if (variant === "icon") {
    return (
      <IconButton
        icon="changed"
        label={label}
        size={size}
        intent={intent}
        disabled={spinning}
        onClick={handleRefresh}
        className={cn(className, spinning && "opacity-80")}
      />
    );
  }

  return (
    <Button
      type="button"
      size={size}
      intent={intent}
      disabled={spinning}
      onClick={handleRefresh}
      className={className}
    >
      <Icon
        name="changed"
        size={size === "sm" ? 14 : 16}
        className={cn(spinning && "animate-spin")}
      />
      <span>{spinning ? "Refreshing…" : label}</span>
    </Button>
  );
}
