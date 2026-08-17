"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  actorTypes,
  featureStatuses,
  issueStatuses,
  resultStatuses,
  testCaseStatuses,
  testRunStatuses,
} from "@/config/status.config";

const statusGroups = [
  { title: "Feature status", statuses: featureStatuses },
  { title: "Test case status", statuses: testCaseStatuses },
  { title: "Test run status", statuses: testRunStatuses },
  { title: "Result status", statuses: resultStatuses },
  { title: "Issue status", statuses: issueStatuses },
];

export function FeedbackSection() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h3 className="text-title-md text-foreground">Toast</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            intent="secondary"
            onClick={() =>
              toast({
                title: "Connection verified",
                description: "The MCP connection responded 2 seconds ago.",
                variant: "pass",
              })
            }
          >
            Trigger success toast
          </Button>
          <Button
            intent="secondary"
            onClick={() =>
              toast({
                title: "Claude is saving 8 test cases…",
                variant: "ai",
              })
            }
          >
            Trigger Claude toast
          </Button>
          <Button
            intent="secondary"
            onClick={() =>
              toast({
                title: "Couldn't reach the connection test endpoint",
                description: "Check your network and try again.",
                variant: "fail",
              })
            }
          >
            Trigger error toast
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <h3 className="text-title-md text-foreground">Badge — every domain status</h3>
        {statusGroups.map((group) => (
          <div key={group.title} className="flex flex-col gap-2">
            <p className="text-label-style text-foreground-muted">{group.title}</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(group.statuses).map(([key, def]) => (
                <Badge key={key} tone={def.tone} icon={def.icon}>
                  {def.label}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-title-md text-foreground">Avatar / actor mark</h3>
        <div className="flex items-center gap-3">
          <Avatar name="Priya Nair" variant="person" />
          <Avatar name="Claude" variant="agent" icon={actorTypes.claude.icon} />
          <Avatar name="Veriqo" variant="system" icon={actorTypes.system.icon} />
          <Avatar name="Priya Nair" variant="person" size="lg" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-title-md text-foreground">Skeleton</h3>
        <div className="flex max-w-sm flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-title-md text-foreground">Empty state</h3>
        <EmptyState
          icon="testCases"
          title="No test cases yet"
          description="Generate coverage for this feature, or add a test case by hand."
          action={<Button size="sm">Generate test cases</Button>}
        />
      </div>
    </div>
  );
}
