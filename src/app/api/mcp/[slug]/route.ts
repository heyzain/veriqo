import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { handleMcpRequest } from "@/server/services/mcp-service";

/**
 * The Claude MCP endpoint itself — what the command/config blocks on the
 * `/mcp` setup page point at. Authenticated by a per-project bearer secret
 * (`Authorization: Bearer <secret>`), not a session cookie, so it is
 * reachable from a Claude Code/Desktop client, not just the browser.
 * `mcp-service.handleMcpRequest` owns every authorization, rate-limiting,
 * and audit-logging rule; this handler only translates HTTP <-> that call.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Request body must be valid JSON." }, { status: 400 });
  }

  const result = await handleMcpRequest(slug, request.headers.get("authorization"), body);
  return NextResponse.json(result.body, { status: result.httpStatus });
}
