/**
 * Pure session-token sign/verify, deliberately built on the standard Web
 * Crypto API (`crypto.subtle`) instead of `node:crypto` so the exact same
 * code runs in both the Node.js server actions (`session.ts`) and the Edge
 * runtime `src/proxy.ts` uses for route protection — no "server-only"
 * import, no `next/headers`, no Node-only APIs.
 */
export type SessionPayload = {
  userId: string;
  expiresAt: number;
};

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

export async function signSessionToken(payload: SessionPayload, secret: string): Promise<string> {
  const json = btoa(JSON.stringify(payload));
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(json));
  return `${json}.${toHex(signature)}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
  const [json, signatureHex] = token.split(".");
  if (!json || !signatureHex) return null;

  const key = await importKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromHex(signatureHex),
    new TextEncoder().encode(json),
  );
  if (!valid) return null;

  try {
    const payload = JSON.parse(atob(json)) as SessionPayload;
    if (typeof payload.userId !== "string" || typeof payload.expiresAt !== "number") return null;
    if (payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
