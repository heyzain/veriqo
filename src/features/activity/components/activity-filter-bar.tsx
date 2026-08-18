"use client";

import { useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { actorTypes } from "@/config/status.config";

const actorOptions = [
  { value: "all", label: "All actors" },
  ...Object.entries(actorTypes).map(([value, def]) => ({ value, label: def.label })),
];

const entityTypeOptions = [
  { value: "all", label: "All records" },
  { value: "project", label: "Project" },
  { value: "feature", label: "Features" },
  { value: "testCase", label: "Test cases" },
  { value: "testRun", label: "Test runs" },
  { value: "testResult", label: "Results" },
  { value: "issue", label: "Issues" },
  { value: "mcpConnection", label: "Claude MCP" },
];

/** URL-driven filters for the Activity ledger (Phase 9 Build: "Chronological activity ledger with filters and deep links"), mirroring `TestRunFilterBar`. */
export function ActivityFilterBar() {
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

  const actor = searchParams.get("actor") ?? "all";
  const entityType = searchParams.get("entityType") ?? "all";
  const currentQuery = searchParams.get("q") ?? "";
  const hasFilters = actor !== "all" || entityType !== "all" || Boolean(currentQuery);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Input
          key={currentQuery}
          label="Search activity"
          hideLabel
          placeholder="Search by actor or action…"
          defaultValue={currentQuery}
          onChange={(event) => handleSearchChange(event.target.value)}
          containerClassName="w-full sm:max-w-xs"
        />
        <Select
          label="Actor"
          hideLabel
          value={actor}
          onValueChange={(value) => updateParam("actor", value, "all")}
          options={actorOptions}
        />
        <Select
          label="Record type"
          hideLabel
          value={entityType}
          onValueChange={(value) => updateParam("entityType", value, "all")}
          options={entityTypeOptions}
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
