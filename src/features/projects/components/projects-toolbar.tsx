"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";

/**
 * Search and the active/archived toggle are both URL-driven
 * (03-CLAUDE-RULES.md, "Tables and record lists" — "URL-driven filters,
 * sorting, pagination... where practical"), so the state survives a refresh
 * or a shared link.
 */
export function ProjectsToolbar({
  query,
  view,
  archivedCount,
}: {
  query: string;
  view: "active" | "archived";
  archivedCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(next: { q?: string; view?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Input
        label="Search projects"
        hideLabel
        placeholder="Search projects…"
        defaultValue={query}
        containerClassName="sm:max-w-xs"
        onChange={(event) => updateParams({ q: event.target.value })}
      />
      <SegmentedControl
        label="Project view"
        value={view}
        onValueChange={(next) => updateParams({ view: next === "active" ? undefined : next })}
        options={[
          { value: "active", label: "Active" },
          { value: "archived", label: `Archived (${archivedCount})` },
        ]}
      />
    </div>
  );
}
