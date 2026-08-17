/**
 * The swatch background reads `var(--cssVar)` directly — the color itself
 * is the live proof that tokens.css is the source of truth, no runtime
 * DOM read needed.
 */
export function ColorSwatch({ name, cssVar }: { name: string; cssVar: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-14 w-full rounded-md border border-subtle"
        style={{ background: `var(${cssVar})` }}
      />
      <div className="flex flex-col">
        <span className="text-body-sm font-medium text-foreground">{name}</span>
        <span className="font-mono text-mono-sm text-foreground-muted">{cssVar}</span>
      </div>
    </div>
  );
}
