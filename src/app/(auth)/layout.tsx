import type { ReactNode } from "react";

import Link from "next/link";

import {
  AuthBrandPanel,
  AuthBrandStatement,
} from "@/features/auth/components/auth-brand-panel";
import { productConfig } from "@/config/product.config";

/**
 * The 42/58 auth split from 01-DESIGN-SYSTEM.md ("Auth layout"). Every auth
 * page (sign in, sign up, forgot/reset password, email verification, invite
 * acceptance) renders inside this shell.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[42fr_58fr]">
      <AuthBrandPanel />
      <div className="flex flex-col items-center justify-center px-6 py-12 sm:px-10">
        <div className="flex w-full max-w-[440px] flex-col gap-8">
          <div className="lg:hidden">
            <AuthBrandStatement />
          </div>
          <main id="main-content" className="flex flex-col gap-8">
            {children}
          </main>
          <div className="flex flex-col items-center gap-1.5 text-center text-body-sm text-foreground-muted">
            <p>
              Need help? Email{" "}
              <a href={`mailto:${productConfig.supportEmail}`} className="text-action underline">
                {productConfig.supportEmail}
              </a>
            </p>
            <p>
              <Link href={productConfig.urls.privacy} className="underline hover:text-foreground">
                Privacy
              </Link>
              <span aria-hidden="true"> · </span>
              <Link href={productConfig.urls.terms} className="underline hover:text-foreground">
                Terms
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
