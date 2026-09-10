import { afterEach, expect, it, vi } from "vitest";
import { ConvexError } from "convex/values";
import { mcpError } from "../lib/mcp-errors";

afterEach(() => vi.restoreAllMocks());
it("does not label formatter failures as authentication or request a research restart", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const result = mcpError(
    new TypeError("Cannot read properties of undefined (reading 'readiness')"),
    "get_research_packet",
  );
  expect(result.structuredContent.error.code).toBe("request_failed");
  expect(result.structuredContent.nextAction).toContain(
    "failed read does not mean",
  );
  expect(result.structuredContent.nextAction).toContain("waitSeconds: 0");
  expect(log).toHaveBeenCalledWith(
    expect.objectContaining({
      operation: "get_research_packet",
      errorType: "TypeError",
    }),
  );
});
it("requests reauthentication only when the backend actually rejects authentication", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const result = mcpError(
    new ConvexError("OAuth token verification failed"),
    "get_run",
  );
  expect(result.structuredContent.error.code).toBe("authentication_required");
  expect(result.structuredContent.nextAction).toContain(
    "Reconnect Relay authentication",
  );
});
it("keeps source-resolution errors actionable without logging credentials or remote error text", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const result = mcpError(
    new ConvexError("Evidence abc is pending. Wait for retrieval."),
    "save_research",
  );
  expect(result.structuredContent.error.message).toContain(
    "Evidence abc is pending",
  );
  mcpError(new Error("remote failure with secret-token"), "get_run");
  expect(JSON.stringify(log.mock.calls)).not.toContain("secret-token");
});
