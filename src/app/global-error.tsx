"use client";

/**
 * Unrecoverable error boundary for the root layout itself. Replaces the
 * entire document, so it must render its own <html>/<body>.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "32px",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f5f2ea",
          color: "#13251f",
        }}
      >
        <p style={{ fontSize: "18px", fontWeight: 600 }}>
          Veriqo couldn&apos;t load this page.
        </p>
        <p style={{ fontSize: "14px", color: "#667a72", maxWidth: "360px" }}>
          Something went wrong outside a page&apos;s normal error handling. Reloading usually
          fixes this.
        </p>
        <button
          onClick={() => reset()}
          style={{
            height: "40px",
            padding: "0 16px",
            borderRadius: "10px",
            background: "#2f7a60",
            color: "#f7f4eb",
            border: "none",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
