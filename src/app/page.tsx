import { redirect } from "next/navigation";

import { getCurrentUser } from "@/server/services/auth-service";

/**
 * Phase 0 left this as an honest placeholder pointing at `/design-tokens`
 * and `/component-lab`. Phase 1 replaces it with real workspace entry: `/`
 * itself renders nothing — it only decides where to send the visitor.
 */
export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? "/projects" : "/sign-in");
}
