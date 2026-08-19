import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/services/auth-service";
import { exportAccountData } from "@/server/services/account-service";

/**
 * "Export my data" (Phase 10 Build: "minimal account deletion/export
 * flows") — every project the signed-in account owns, as one JSON file.
 * Session-authenticated like the rest of the app, not a bearer token —
 * this is a browser download, not an MCP integration.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in to export your data." }, { status: 401 });
  }

  const data = exportAccountData(user);
  const fileName = `veriqo-export-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
