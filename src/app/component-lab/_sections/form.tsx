"use client";

import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Input, Textarea } from "@/components/ui/input";
import { Radio, RadioGroup } from "@/components/ui/radio";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const environmentOptions = [
  { value: "staging", label: "Staging" },
  { value: "production", label: "Production" },
  { value: "local", label: "Local" },
];

const featureOptions = [
  { value: "feat-authentication", label: "Authentication" },
  { value: "feat-private-vault", label: "Private Vault" },
  { value: "feat-search", label: "Search" },
  { value: "feat-tags", label: "Tags" },
];

export function FormSection() {
  const [comboboxValue, setComboboxValue] = useState<string | null>("feat-private-vault");
  const [switchOn, setSwitchOn] = useState(true);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Input label="Test run name" placeholder="Release Candidate 1" defaultValue="Release Candidate 1" />
        <Input
          label="Build"
          description="Shown on the run detail and in activity."
          placeholder="1.4.0-rc.1"
        />
        <Input label="Assignee email" error="Enter a valid email address." defaultValue="not-an-email" />
        <Input label="Disabled field" defaultValue="Locked while the run is in progress" disabled />
      </div>

      <Textarea
        label="Actual result"
        description="Required for Fail, Partial, and Blocked outcomes."
        placeholder="Describe what actually happened…"
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Select label="Environment" placeholder="Choose an environment" options={environmentOptions} defaultValue="staging" />
        <Combobox
          label="Feature"
          description="Type to filter."
          options={featureOptions}
          value={comboboxValue}
          onValueChange={setComboboxValue}
        />
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-title-md text-foreground">Checkbox</h3>
        <Checkbox label="Notify me when this run completes" defaultChecked />
        <Checkbox label="Disabled option" disabled description="Not available for manual runs." />
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-title-md text-foreground">Radio group</h3>
        <RadioGroup defaultValue="manual" aria-label="Execution mode">
          <Radio value="manual" label="Manual" description="Step through each test yourself." />
          <Radio value="claude" label="Claude-assisted" description="Claude submits results for human review." />
        </RadioGroup>
      </div>

      <div className="max-w-sm">
        <Switch
          label="Claude-assisted runs"
          description="Feature-flagged off for MVP scope."
          checked={switchOn}
          onCheckedChange={setSwitchOn}
        />
      </div>
    </div>
  );
}
