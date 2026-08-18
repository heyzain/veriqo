/**
 * Timestamps are stored in UTC and rendered in the user's locale
 * (03-CLAUDE-RULES.md, "Data and server boundaries"). There's no
 * account-level locale/timezone preference yet (arrives with account
 * settings) — `en-US` is a fixed interim rather than the runtime's default
 * locale, which would differ between server and client and risk a
 * hydration mismatch.
 */
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

/**
 * "2 minutes ago" style relative time, for last-seen/last-activity moments
 * where the exact timestamp matters less than how fresh it is (e.g. MCP
 * connection state). Falls back to `formatDate` beyond a week, where
 * relative phrasing stops being useful.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const diffSeconds = Math.round(diffMs / 1000);

  if (diffSeconds < 5) return "just now";
  if (diffSeconds < 60) return `${diffSeconds} second${diffSeconds === 1 ? "" : "s"} ago`;

  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return formatDate(iso);
}
