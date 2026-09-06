import { verifyClerkToken } from "@clerk/mcp-tools/next";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionArgs } from "convex/server";
import { ConvexError } from "convex/values";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { api } from "@/convex/_generated/api";

const id = z.string().min(1).max(128);
const requestId = id.describe(
  "A unique request ID. Reuse it only when retrying identical content.",
);
const claim = z.object({
  text: z.string().min(1).max(4000),
  assessment: z.enum(["supported", "disputed", "uncertain"]),
  note: z.string().max(4000),
  evidence: z
    .array(
      z.object({
        url: z.url().max(2048),
        title: z.string().min(1).max(500),
        excerpt: z.string().min(1).max(8000),
        retrievedAt: z
          .number()
          .nonnegative()
          .describe("Unix milliseconds when retrieved"),
        provenance: z.literal("agent"),
      }),
    )
    .max(10),
});
const handler = createMcpHandler(
  (server) => {
    async function call(
      command:
        | FunctionArgs<typeof api.mcp.read>["command"]
        | FunctionArgs<typeof api.mcp.write>["command"],
      token: string | undefined,
    ) {
      if (!token)
        return {
          isError: true,
          content: [
            { type: "text" as const, text: "Authentication required." },
          ],
        };
      const url = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (!url) throw new Error("Missing NEXT_PUBLIC_CONVEX_URL");
      const client = new ConvexHttpClient(url);
      try {
        if (
          command.kind === "projects" ||
          command.kind === "project" ||
          command.kind === "topic"
        ) {
          const data = await client.action(api.mcp.read, { token, command });
          return {
            structuredContent: data,
            content: [{ type: "text" as const, text: JSON.stringify(data) }],
          };
        }
        const result = await client.action(api.mcp.write, { token, command });
        const data = {
          ...result,
          nextAction:
            result.status === "in_review"
              ? "Review this version in Relay."
              : result.status === "draft"
                ? "Submit the saved version for review when ready."
                : "Read the saved topic or project to continue.",
          path: `/projects/${result.projectId}${result.topicId ? `?topic=${result.topicId}` : ""}`,
        };
        return {
          structuredContent: data,
          content: [{ type: "text" as const, text: JSON.stringify(data) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text:
                error instanceof ConvexError && typeof error.data === "string"
                  ? error.data
                  : "Relay could not complete this request. Check authentication and retry with the same request ID.",
            },
          ],
        };
      }
    }
    const readAnnotations = {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    };
    const writeAnnotations = {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
    server.registerTool(
      "list_projects",
      {
        description: "List your Relay projects (up to 100 most recent).",
        inputSchema: z.object({}),
        annotations: readAnnotations,
      },
      (_, extra) => call({ kind: "projects" }, extra.http?.authInfo?.token),
    );
    server.registerTool(
      "get_project",
      {
        description: "Read a project and its 100 most recent topics.",
        inputSchema: z.object({ projectId: id }),
        annotations: readAnnotations,
      },
      (args, extra) =>
        call({ kind: "project", ...args }, extra.http?.authInfo?.token),
    );
    server.registerTool(
      "get_topic",
      {
        description:
          "Read the brief and up to 10 recent research and script versions. Use investigationId to scope research history. Continue from saved state; Relay does not run inference.",
        inputSchema: z.object({ topicId: id, investigationId: id.optional() }),
        annotations: readAnnotations,
      },
      (args, extra) =>
        call({ kind: "topic", ...args }, extra.http?.authInfo?.token),
    );
    server.registerTool(
      "create_topic",
      {
        description: "Create a research topic in an owned project.",
        inputSchema: z.object({
          projectId: id,
          title: z.string().min(1).max(160),
          question: z.string().min(1).max(2000),
          outline: z.string().max(10000),
          requestId,
        }),
        annotations: writeAnnotations,
      },
      (args, extra) =>
        call({ kind: "create_topic", ...args }, extra.http?.authInfo?.token),
    );
    server.registerTool(
      "save_research",
      {
        description:
          "Save research you authored as a new immutable version. Use a stable investigationId for revisions; expectedVersion is 0 for a new investigation. Assessments are agent judgments, not human approval. Evidence is agent-supplied, not independently verified by Relay.",
        inputSchema: z.object({
          topicId: id,
          investigationId: id,
          expectedVersion: z.number().int().nonnegative(),
          summary: z.string().min(1).max(20000),
          claims: z.array(claim).max(50),
          requestId,
        }),
        annotations: writeAnnotations,
      },
      (args, extra) =>
        call({ kind: "save_research", ...args }, extra.http?.authInfo?.token),
    );
    server.registerTool(
      "save_script",
      {
        description:
          "Save your script narration and visual plan. Requires current approved research. One script version sequence per topic; expectedVersion is 0 initially.",
        inputSchema: z.object({
          topicId: id,
          researchVersionId: id,
          expectedVersion: z.number().int().nonnegative(),
          title: z.string().min(1).max(160),
          scenes: z
            .array(
              z.object({
                narration: z.string().min(1).max(10000),
                visual: z.string().min(1).max(10000),
              }),
            )
            .min(1)
            .max(100),
          requestId,
        }),
        annotations: writeAnnotations,
      },
      (args, extra) =>
        call({ kind: "save_script", ...args }, extra.http?.authInfo?.token),
    );
    server.registerTool(
      "submit_research_for_review",
      {
        description:
          "Submit an evidence-backed research version. The human must approve it in Relay.",
        inputSchema: z.object({ versionId: id }),
        annotations: writeAnnotations,
      },
      (args, extra) =>
        call({ kind: "submit_research", ...args }, extra.http?.authInfo?.token),
    );
    server.registerTool(
      "submit_script_for_review",
      {
        description: "Submit a script for human approval in Relay.",
        inputSchema: z.object({ versionId: id }),
        annotations: writeAnnotations,
      },
      (args, extra) =>
        call({ kind: "submit_script", ...args }, extra.http?.authInfo?.token),
    );
  },
  { serverInfo: { name: "relay", version: "0.2.0" } },
);

const authenticatedHandler = withMcpAuth(
  handler,
  async (_request, token) =>
    verifyClerkToken(await auth({ acceptsToken: "oauth_token" }), token),
  {
    required: true,
    requiredScopes: ["openid"],
    resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp",
  },
);
export { authenticatedHandler as POST };
