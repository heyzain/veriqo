"use client";

import { useState } from "react";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const runModeOptions = [
  { value: "manual", label: "Manual" },
  { value: "claude", label: "Claude-assisted" },
];

export function LayoutSection() {
  const [runMode, setRunMode] = useState("manual");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h3 className="text-title-md text-foreground">Tabs</h3>
        <Tabs defaultValue="details" className="max-w-md">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="text-body-sm text-foreground-muted">
            Feature, expected result, and steps.
          </TabsContent>
          <TabsContent value="history" className="text-body-sm text-foreground-muted">
            Every run this case has appeared in.
          </TabsContent>
          <TabsContent value="evidence" className="text-body-sm text-foreground-muted">
            Screenshots and notes attached to past results.
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-title-md text-foreground">Segmented control</h3>
        <SegmentedControl
          label="Execution mode"
          value={runMode}
          onValueChange={setRunMode}
          options={runModeOptions}
        />
      </div>
    </div>
  );
}
