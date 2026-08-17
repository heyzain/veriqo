import type { Metadata } from "next";
import type * as React from "react";

import { ColorSwatch } from "./color-swatch";

export const metadata: Metadata = {
  title: "Design tokens",
};

const primitiveColors = [
  { name: "paper-0", cssVar: "--paper-0" },
  { name: "paper-1", cssVar: "--paper-1" },
  { name: "paper-2", cssVar: "--paper-2" },
  { name: "ink-0", cssVar: "--ink-0" },
  { name: "ink-1", cssVar: "--ink-1" },
  { name: "ink-2", cssVar: "--ink-2" },
  { name: "forest-0", cssVar: "--forest-0" },
  { name: "forest-1", cssVar: "--forest-1" },
  { name: "moss", cssVar: "--moss" },
  { name: "marigold", cssVar: "--marigold" },
  { name: "clay", cssVar: "--clay" },
  { name: "sky", cssVar: "--sky" },
  { name: "violet", cssVar: "--violet" },
];

const semanticColorGroups = [
  {
    title: "Surfaces",
    tokens: [
      { name: "bg-app", cssVar: "--bg-app" },
      { name: "bg-surface", cssVar: "--bg-surface" },
      { name: "bg-raised", cssVar: "--bg-raised" },
      { name: "bg-inset", cssVar: "--bg-inset" },
      { name: "bg-sidebar", cssVar: "--bg-sidebar" },
    ],
  },
  {
    title: "Text",
    tokens: [
      { name: "text-primary", cssVar: "--text-primary" },
      { name: "text-secondary", cssVar: "--text-secondary" },
      { name: "text-muted", cssVar: "--text-muted" },
      { name: "text-on-dark", cssVar: "--text-on-dark" },
    ],
  },
  {
    title: "Borders, action & focus",
    tokens: [
      { name: "border-subtle", cssVar: "--border-subtle" },
      { name: "border-strong", cssVar: "--border-strong" },
      { name: "action-primary", cssVar: "--action-primary" },
      { name: "action-primary-hover", cssVar: "--action-primary-hover" },
      { name: "focus-ring", cssVar: "--focus-ring" },
    ],
  },
  {
    title: "Status",
    tokens: [
      { name: "status-pass", cssVar: "--status-pass" },
      { name: "status-fail", cssVar: "--status-fail" },
      { name: "status-partial", cssVar: "--status-partial" },
      { name: "status-blocked", cssVar: "--status-blocked" },
      { name: "status-progress", cssVar: "--status-progress" },
      { name: "status-ai", cssVar: "--status-ai" },
      { name: "status-neutral", cssVar: "--status-neutral" },
    ],
  },
];

const typeScale = [
  { name: "display-lg", className: "text-display-lg", font: "font-serif", use: "auth/onboarding statement only" },
  { name: "display-md", className: "text-display-md", font: "font-serif", use: "project entry or major empty state" },
  { name: "title-xl", className: "text-title-xl", font: "font-sans", use: "project overview title" },
  { name: "title-lg", className: "text-title-lg", font: "font-sans", use: "page title" },
  { name: "title-md", className: "text-title-md", font: "font-sans", use: "section title" },
  { name: "body-lg", className: "text-body-lg", font: "font-sans", use: "guidance and onboarding copy" },
  { name: "body", className: "text-body", font: "font-sans", use: "default application copy" },
  { name: "body-sm", className: "text-body-sm", font: "font-sans", use: "metadata and supporting text" },
  { name: "label", className: "text-label-style", font: "font-sans", use: "controls and column headers" },
  { name: "eyebrow", className: "text-eyebrow-style", font: "font-sans", use: "rare section marker" },
  { name: "mono-sm", className: "text-mono-sm", font: "font-mono", use: "IDs, commands and technical values" },
] as const;

const spacingScale = [
  { px: 4, className: "w-1" },
  { px: 8, className: "w-2" },
  { px: 12, className: "w-3" },
  { px: 16, className: "w-4" },
  { px: 20, className: "w-5" },
  { px: 24, className: "w-6" },
  { px: 32, className: "w-8" },
  { px: 40, className: "w-10" },
  { px: 48, className: "w-12" },
  { px: 64, className: "w-16" },
  { px: 80, className: "w-20" },
];

const radiusScale = [
  { name: "radius-xs", className: "rounded-xs" },
  { name: "radius-sm", className: "rounded-sm" },
  { name: "radius-md", className: "rounded-md" },
  { name: "radius-lg", className: "rounded-lg" },
  { name: "radius-xl", className: "rounded-xl" },
  { name: "radius-pill", className: "rounded-pill" },
];

const shadowScale = [
  { name: "shadow-sm", className: "shadow-sm" },
  { name: "shadow-md", className: "shadow-md" },
  { name: "shadow-lg", className: "shadow-lg" },
];

const motionTokens = [
  { name: "motion-fast", cssVar: "--motion-fast", className: "transition-fast", use: "hover / focus" },
  { name: "motion-base", cssVar: "--motion-base", className: "transition-base", use: "drawer / modal" },
  { name: "motion-slow", cssVar: "--motion-slow", className: "transition-slow", use: "state transition / progress" },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 border-t border-subtle pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-title-lg text-foreground">{title}</h2>
        {description ? <p className="text-body-sm text-foreground-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function DesignTokensPage() {
  return (
    <main id="main-content" className="mx-auto flex max-w-[1480px] flex-col gap-8 px-8 py-16 sm:px-10">
      <header className="flex flex-col gap-2">
        <p className="text-eyebrow-style text-foreground-muted">Phase 0 — Foundation</p>
        <h1 className="text-title-xl text-foreground">Design tokens</h1>
        <p className="max-w-2xl text-body-lg text-foreground-secondary">
          Every swatch, size, and duration below renders through the actual CSS variables and
          Tailwind utilities defined in{" "}
          <code className="font-mono text-mono-sm">src/design-system/</code> — nothing here is a
          hardcoded duplicate. If a token changes, this page changes with it.
        </p>
      </header>

      <Section title="Color primitives" description="Raw palette. Components never reference these directly.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {primitiveColors.map((token) => (
            <ColorSwatch key={token.cssVar} {...token} />
          ))}
        </div>
      </Section>

      {semanticColorGroups.map((group) => (
        <Section key={group.title} title={group.title} description="Semantic tokens — the only colors components use.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
            {group.tokens.map((token) => (
              <ColorSwatch key={token.cssVar} {...token} />
            ))}
          </div>
        </Section>
      ))}

      <Section title="Typography" description="Type scale from 01-DESIGN-SYSTEM.md, rendered with the actual Tailwind utility.">
        <div className="flex flex-col divide-y divide-subtle">
          {typeScale.map((token) => (
            <div key={token.name} className="flex flex-wrap items-baseline justify-between gap-3 py-3">
              <span className={`${token.font} ${token.className} text-foreground`}>Veriqo Aa 123</span>
              <span className="font-mono text-mono-sm text-foreground-muted">
                {token.name} · {token.use}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Spacing" description="8px base grid (4px for small optical adjustments). Bars use ordinary Tailwind width utilities on the shared spacing scale.">
        <div className="flex flex-col gap-2">
          {spacingScale.map((step) => (
            <div key={step.px} className="flex items-center gap-3">
              <span className="w-10 shrink-0 font-mono text-mono-sm text-foreground-muted">{step.px}px</span>
              <div className={`h-3 rounded-xs bg-action ${step.className}`} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radius">
        <div className="flex flex-wrap gap-4">
          {radiusScale.map((token) => (
            <div key={token.name} className="flex flex-col items-center gap-2">
              <div className={`size-16 border border-subtle bg-surface ${token.className}`} />
              <span className="font-mono text-mono-sm text-foreground-muted">{token.name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Elevation">
        <div className="flex flex-wrap gap-6">
          {shadowScale.map((token) => (
            <div key={token.name} className="flex flex-col items-center gap-2">
              <div className={`size-16 rounded-md bg-raised ${token.className}`} />
              <span className="font-mono text-mono-sm text-foreground-muted">{token.name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Motion" description="Hover to see each duration. Respects prefers-reduced-motion.">
        <div className="flex flex-col gap-4">
          {motionTokens.map((token) => (
            <div key={token.name} className="flex items-center gap-4">
              <span className="w-32 shrink-0 font-mono text-mono-sm text-foreground-muted">{token.name}</span>
              <div className="group h-9 w-48 rounded-sm bg-inset p-1">
                <div
                  className={`h-full w-9 rounded-xs bg-action ${token.className} group-hover:translate-x-[132px]`}
                />
              </div>
              <span className="text-body-sm text-foreground-muted">{token.use}</span>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
