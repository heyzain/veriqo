import { productConfig } from "@/config/product.config";

/**
 * The desktop brand/story panel (01-DESIGN-SYSTEM.md, "Auth layout" — "Left:
 * deep forest brand/story panel with restrained geometry and one memorable
 * sentence"). Geometry stays quiet: a few fine rules, no gradients, no
 * decorative motion.
 */
export function AuthBrandPanel() {
  return (
    <div className="relative hidden h-full flex-col justify-between overflow-hidden bg-sidebar px-12 py-14 text-foreground-on-dark lg:flex">
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full opacity-[0.06]"
        viewBox="0 0 480 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <line x1="0" y1="120" x2="480" y2="120" stroke="currentColor" strokeWidth="1" />
        <line x1="0" y1="680" x2="480" y2="680" stroke="currentColor" strokeWidth="1" />
        <circle cx="420" cy="80" r="120" stroke="currentColor" strokeWidth="1" fill="none" />
        <circle cx="40" cy="740" r="160" stroke="currentColor" strokeWidth="1" fill="none" />
      </svg>

      <p className="relative text-title-md font-medium tracking-tight">{productConfig.name}</p>

      <p className="relative max-w-sm font-serif text-display-md italic leading-tight text-foreground-on-dark">
        {productConfig.tagline}
      </p>

      <p className="relative max-w-sm text-body text-foreground-on-dark/70">
        {productConfig.description}
      </p>
    </div>
  );
}

/**
 * The compact statement mobile keeps once the full panel is removed
 * ("Mobile removes the full story panel and retains a small brand statement
 * above the form.").
 */
export function AuthBrandStatement() {
  return (
    <div className="flex flex-col gap-1 lg:hidden">
      <p className="text-label-style text-foreground-muted">{productConfig.name}</p>
      <p className="font-serif text-title-lg italic text-foreground">{productConfig.tagline}</p>
    </div>
  );
}
