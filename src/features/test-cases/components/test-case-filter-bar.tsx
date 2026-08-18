"use client";

import { useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { testCasePriorities, testCaseStatuses } from "@/config/status.config";
import type { Feature } from "@/types/domain";

const statusOptions = [
  { value: "all", label: "All statuses" },
  ...Object.entries(testCaseStatuses).map(([value, def]) => ({ value, label: def.label })),
];

const priorityOptions = [
  { value: "all", label: "All priorities" },
  ...Object.entries(testCasePriorities).map(([value, def]) => ({ value, label: def.label })),
];

const groupOptions = [
  { value: "feature", label: "Group by feature" },
  { value: "status", label: "Group by review state" },
  { value: "priority", label: "Group by priority" },
  { value: "none", label: "No grouping" },
];

export type TestCaseFilterBarProps = {
  features: readonly Feature[];
};

/**
 * URL-driven filters — the same pattern `FeatureFilterBar` established for
 * Phase 4 (03-CLAUDE-RULES.md, "Tables and record lists — URL-driven
 * filters"). Grouping defaults to "feature" here (not "none") since Phase 5
 * specifically asks test cases to "support feature grouping" and preserve
 * the visual chain from case to parent feature.
 */
export function TestCaseFilterBar({ features }: TestCaseFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<number | undefined>(undefined);

  function updateParam(key: string, value: string, defaultValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === defaultValue) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  function handleSearchChange(value: string) {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => updateParam("q", value, ""), 300);
  }

  const status = searchParams.get("status") ?? "all";
  const priority = searchParams.get("priority") ?? "all";
  const feature = searchParams.get("feature") ?? "all";
  const group = searchParams.get("group") ?? "feature";
  const currentQuery = searchParams.get("q") ?? "";
  const hasFilters = status !== "all" || priority !== "all" || feature !== "all" || Boolean(currentQuery);

  const featureOptions = [
    { value: "all", label: "All features" },
    ...features.map((f) => ({ value: f.publicId, label: `${f.publicId} — ${f.name}` })),
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Input
          key={currentQuery}
          label="Search test cases"
          hideLabel
          placeholder="Search by title or ID…"
          defaultValue={currentQuery}
          onChange={(event) => handleSearchChange(event.target.value)}
          containerClassName="w-full sm:max-w-xs"
        />
        <Select
          label="Feature"
          hideLabel
          value={feature}
          onValueChange={(value) => updateParam("feature", value, "all")}
          options={featureOptions}
        />
        <Select
          label="Review state"
          hideLabel
          value={status}
          onValueChange={(value) => updateParam("status", value, "all")}
          options={statusOptions}
        />
        <Select
          label="Priority"
          hideLabel
          value={priority}
          onValueChange={(value) => updateParam("priority", value, "all")}
          options={priorityOptions}
        />
        <Select
          label="Grouping"
          hideLabel
          value={group}
          onValueChange={(value) => updateParam("group", value, "feature")}
          options={groupOptions}
        />
      </div>
      {hasFilters ? (
        <Button
          type="button"
          intent="ghost"
          size="sm"
          onClick={() => router.replace(`${pathname}?group=${group}`)}
        >
          <Icon name="close" size={14} />
          <span>Clear filters</span>
        </Button>
      ) : null}
    </div>
  );
}
