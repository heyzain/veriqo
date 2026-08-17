"use client";

import { useState } from "react";

import { Button, IconButton } from "@/components/ui/button";

const intents = ["primary", "secondary", "ghost", "danger"] as const;
const sizes = ["sm", "md", "lg"] as const;

export function ActionsSection() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h3 className="text-title-md text-foreground">Button — intents</h3>
        <div className="flex flex-wrap items-center gap-3">
          {intents.map((intent) => (
            <Button key={intent} intent={intent}>
              {intent}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-title-md text-foreground">Button — sizes</h3>
        <div className="flex flex-wrap items-center gap-3">
          {sizes.map((size) => (
            <Button key={size} size={size}>
              {size}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-title-md text-foreground">Button — states</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Default</Button>
          <Button disabled>Disabled</Button>
          <Button
            loading={loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1500);
            }}
          >
            {loading ? "Saving…" : "Click to load"}
          </Button>
          <Button className="focus-demo">Tab here to see focus ring</Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-title-md text-foreground">IconButton</h3>
        <div className="flex flex-wrap items-center gap-3">
          <IconButton icon="plus" label="Add" />
          <IconButton icon="more" label="More actions" intent="ghost" />
          <IconButton icon="close" label="Dismiss" intent="secondary" />
          <IconButton icon="plus" label="Add (disabled)" disabled />
        </div>
      </div>
    </div>
  );
}
