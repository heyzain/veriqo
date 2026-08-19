import type { NextRequest } from "next/server";

import { handleMcpRequest } from "@/server/services/mcp-service";

/**
 * The Claude MCP endpoint itself — what the command/config blocks on the
 * `/mcp` setup page point at (`claude mcp add --transport http ...`, or the
 * equivalent `claude_desktop_config.json` entry). A real MCP Streamable
 * HTTP server: POST carries JSON-RPC messages (`initialize`, `tools/list`,
 * `tools/call`, ...), GET/DELETE are the transport's stream/session
 * lifecycle methods. Authenticated by a per-project bearer secret
 * (`Authorization: Bearer <secret>`), not a session cookie, so it is
 * reachable from a Claude Code/Desktop client, not just the browser.
 * `mcp-service.handleMcpRequest` owns every authorization, rate-limiting,
 * and audit-logging rule, then hands the raw request to the MCP transport
 * (`server/mcp/protocol-server.ts`) — this handler only extracts the route
 * param and returns whatever `Response` that produces.
 */
async function handle(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handleMcpRequest(slug, request.headers.get("authorization"), request);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
