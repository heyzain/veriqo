import Link from "next/link";

import { Button } from "@/components/ui/button";
import { productConfig } from "@/config/product.config";

/**
 * Placeholder root route. Phase 1 replaces this with real sign-in and
 * workspace entry — until then this exists only so `/` resolves to
 * something honest, and so Phase 0's two required routes are one click
 * away for review.
 */
export default function Home() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-screen max-w-[1480px] flex-col items-center justify-center gap-8 px-8 py-24 text-center"
    >
      <div className="flex flex-col gap-3">
        <p className="text-eyebrow-style text-foreground-muted">Phase 0 — Architecture foundation</p>
        <h1 className="font-serif text-display-md text-foreground">{productConfig.name}</h1>
        <p className="max-w-md text-body-lg text-foreground-secondary">
          {productConfig.tagline} The product experience starts in Phase 1 — for now, review the
          design foundation below.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/design-tokens">Design tokens</Link>
        </Button>
        <Button asChild intent="secondary">
          <Link href="/component-lab">Component lab</Link>
        </Button>
      </div>
    </main>
  );
}
