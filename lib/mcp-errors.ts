import { ConvexError } from "convex/values";

export function mcpError(error: unknown, operation: string) {
  const known =
    error instanceof ConvexError && typeof error.data === "string"
      ? error.data
      : undefined;
  const authentication =
    known !== undefined &&
    [
      "Unauthenticated",
      "OAuth token verification failed",
      "Authentication required.",
    ].includes(known);
  const reference = crypto.randomUUID();
  const nextAction = authentication
    ? "Reconnect Relay authentication, then retry the requested operation."
    : operation === "get_run" ||
        operation === "get_research_packet" ||
        operation === "get_evidence"
      ? "Retry this read with waitSeconds: 0 where supported. A failed read does not mean the research run failed; do not restart or recover a run solely because reading failed."
      : "Read the current topic before retrying. Preserve the original request key for a creation or research submission.";
  const message =
    known ??
    `Relay could not complete ${operation}. This error does not establish an authentication failure. Reference: ${reference}.`;
  // Do not log token-bearing request arguments, raw remote errors, or source text.
  console.error({
    event: "relay_mcp_request_failed",
    reference,
    operation,
    category: authentication
      ? "authentication"
      : known
        ? "request_rejected"
        : "internal_or_transport",
    errorType: error instanceof Error ? error.name : "unknown",
  });
  return {
    isError: true,
    structuredContent: {
      error: {
        code: authentication
          ? "authentication_required"
          : known
            ? "request_rejected"
            : "request_failed",
        message,
        reference,
      },
      nextAction,
    },
    content: [{ type: "text" as const, text: `${message}\n${nextAction}` }],
  };
}
