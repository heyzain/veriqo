"use client";

import { useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { testRunStatuses } from "@/config/status.config";

const statusOptions = [
  { value: "all", label: "All statuses" },
  ...Object.entries(testRunStatuses).map(([value, def]) => ({ value, label: def.label })),
];

/**
 * URL-driven filters for the run list (03-CLAUDE-RULES.md, "Tables and
 * record lists — URL-driven filters"), mirroring `TestCaseFilterBar`.
 */
export function TestRunFilterBar() {
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
  const currentQuery = searchParams.get("q") ?? "";
  const hasFilters = status !== "all" || Boolean(currentQuery);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Input
          key={currentQuery}
          label="Search test runs"
          hideLabel
          placeholder="Search by name, ID, or build…"
          defaultValue={currentQuery}
          onChange={(event) => handleSearchChange(event.target.value)}
          containerClassName="w-full sm:max-w-xs"
        />
        <Select
          label="Status"
          hideLabel
          value={status}
          onValueChange={(value) => updateParam("status", value, "all")}
          options={statusOptions}
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
