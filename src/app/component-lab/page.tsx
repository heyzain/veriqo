"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ActionsSection } from "./_sections/actions";
import { FeedbackSection } from "./_sections/feedback";
import { FormSection } from "./_sections/form";
import { LayoutSection } from "./_sections/layout";
import { OverlaysSection } from "./_sections/overlays";

/**
 * Every ui/ primitive, in every state the Phase 0 acceptance criteria call
 * out: default, disabled, loading, error, and (via the keyboard) focus.
 * This route has no metadata export — it's a client component so its
 * interactive demos work standalone.
 */
export default function ComponentLabPage() {
  return (
    <main id="main-content" className="mx-auto flex max-w-[1480px] flex-col gap-8 px-8 py-16 sm:px-10">
      <header className="flex flex-col gap-2">
        <p className="text-eyebrow-style text-foreground-muted">Phase 0 — Foundation</p>
        <h1 className="text-title-xl text-foreground">Component lab</h1>
        <p className="max-w-2xl text-body-lg text-foreground-secondary">
          Every core primitive from 01-DESIGN-SYSTEM.md, wired to real state. Badge tones are
          pulled directly from <code className="font-mono text-mono-sm">status.config.ts</code>.
        </p>
      </header>

      <Tabs defaultValue="actions">
        <TabsList>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="form">Form</TabsTrigger>
          <TabsTrigger value="overlays">Overlays</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>
        <TabsContent value="actions">
          <ActionsSection />
        </TabsContent>
        <TabsContent value="form">
          <FormSection />
        </TabsContent>
        <TabsContent value="overlays">
          <OverlaysSection />
        </TabsContent>
        <TabsContent value="layout">
          <LayoutSection />
        </TabsContent>
        <TabsContent value="feedback">
          <FeedbackSection />
        </TabsContent>
      </Tabs>
    </main>
  );
}
