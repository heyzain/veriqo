"use client";

import { useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { featureStatuses } from "@/config/status.config";

const statusOptions = [
  { value: "all", label: "All statuses" },
  ...Object.entries(featureStatuses).map(([value, def]) => ({ value, label: def.label })),
];

const riskOptions = [
  { value: "all", label: "All risk levels" },
  { value: "high", label: "High risk" },
  { value: "medium", label: "Medium risk" },
  { value: "low", label: "Low risk" },
];

const groupOptions = [
  { value: "none", label: "No grouping" },
  { value: "status", label: "Group by review state" },
  { value: "risk", label: "Group by risk" },
];

/**
 * URL-driven filters, sorting is intentionally not offered here yet
 * (03-CLAUDE-RULES.md, "Tables and record lists — URL-driven filters,
 * sorting, pagination"). Every control writes straight to the query string
 * so the exact same view survives a reload, a shared link, or browser
 * back/forward.
 *
 * The search field stays uncontrolled and is only ever re-keyed off the
 * committed `q` param — not synced via an effect — so typing never fights a
 * render loop, and an external URL change (Clear filters, back/forward)
 * still remounts it with the right text.
 */
export function FeatureFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<number | undefined>(undefined);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all" || value === "none") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  function handleSearchChange(value: string) {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => updateParam("q", value), 300);
  }

  const status = searchParams.get("status") ?? "all";
  const risk = searchParams.get("risk") ?? "all";
  const group = searchParams.get("group") ?? "none";
  const currentQuery = searchParams.get("q") ?? "";
  const hasFilters = status !== "all" || risk !== "all" || Boolean(currentQuery);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
        <Input
          key={currentQuery}
          label="Search features"
          hideLabel
          placeholder="Search by name or description…"
          defaultValue={currentQuery}
          onChange={(event) => handleSearchChange(event.target.value)}
          containerClassName="w-full sm:max-w-xs"
        />
        <Select
          label="Review state"
          hideLabel
          value={status}
          onValueChange={(value) => updateParam("status", value)}
          options={statusOptions}
        />
        <Select
          label="Risk"
          hideLabel
          value={risk}
          onValueChange={(value) => updateParam("risk", value)}
          options={riskOptions}
        />
        <Select
          label="Grouping"
          hideLabel
          value={group}
          onValueChange={(value) => updateParam("group", value)}
          options={groupOptions}
        />
      </div>
      {hasFilters ? (
        <Button type="button" intent="ghost" size="sm" onClick={() => router.replace(pathname)}>
          <Icon name="close" size={14} />
          <span>Clear filters</span>
        </Button>
      ) : null}
    </div>
  );
}
