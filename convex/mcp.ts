"use node";
import { discoveryCommand } from "./model/discoveryContracts";
import { sourceCommand, sourceResult } from "./model/draftContracts";
import type { writeOwned } from "./research";
import {
  readResearchCommand,
  writeResearchCommand,
  researchReadResult,
  publicRunResult,
} from "./model/researchContracts";
import { createClerkClient } from "@clerk/backend";
import { ConvexError, v, type Infer } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  readCommand,
  readResult,
  writeCommand,
  writeResult,
} from "./model/validators";

async function verify(token: string) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey)
    throw new ConvexError("MCP database authentication is not configured.");
  const clerk = createClerkClient({ secretKey });

  let verified: Awaited<ReturnType<typeof clerk.idPOAuthAccessToken.verify>>;
  try {
    verified = await clerk.idPOAuthAccessToken.verify(token);
  } catch {
    throw new ConvexError("OAuth token verification failed");
  }

  if (
    verified.revoked ||
    verified.expired ||
    !verified.subject.startsWith("user_") ||
    !verified.scopes.includes("openid")
  )
    throw new ConvexError("Unauthenticated");
  return verified.subject;
}
export const read = action({
  args: { token: v.string(), command: readCommand },
  returns: readResult,
  handler: async (
    ctx,
    { token, command },
  ): Promise<Infer<typeof readResult>> => {
    const subject = await verify(token);
    return ctx.runQuery(internal.relay.readFromMcp, {
      subject,
      command,
    });
  },
});
export const write = action({
  args: { token: v.string(), command: writeCommand },
  returns: writeResult,
  handler: async (
    ctx,
    { token, command },
  ): Promise<Infer<typeof writeResult>> => {
    const subject = await verify(token);
    return ctx.runMutation(internal.relay.writeFromMcp, {
      subject,
      command,
    });
  },
});

export const researchRead = action({
  args: { token: v.string(), command: readResearchCommand },
  returns: researchReadResult,
  handler: async (
    ctx,
    { token, command },
  ): Promise<Infer<typeof researchReadResult>> => {
    const subject = await verify(token);
    const result = await ctx.runQuery(internal.research.readFromMcp, {
      subject,
      command,
    });
    // Read only storage IDs from the ownership-checked result, never caller URLs.
    if (result.kind === "packet") {
      const sourceContent = await Promise.all(
        result.evidence.flatMap((evidence) => {
          if (evidence.outcome.kind !== "retrieved") return [];
          const storageId = evidence.outcome.storageId;
          return [
            ctx.storage.get(storageId).then(async (blob) => {
              if (!blob)
                throw new ConvexError(
                  `Retrieved content unavailable for evidence ${evidence._id}. Retry retrieval or use another source.`,
                );
              const content = await blob.text();
              return {
                evidenceId: evidence._id,
                content: content.slice(0, 1600),
                truncated: content.length > 1600,
              };
            }),
          ];
        }),
      );
      return { ...result, sourceContent };
    }
    if (result.kind === "evidence") {
      const evidence = result.evidence;
      const offset =
        command.kind === "get_evidence" ? (command.offset ?? 0) : 0;
      const page = (content: string) => ({
        content: content.slice(offset, offset + 20000),
        truncated: content.length > offset + 20000,
        contentLength: content.length,
        ...(content.length > offset + 20000
          ? { nextOffset: offset + 20000 }
          : {}),
      });
      if ("content" in evidence)
        return { ...result, ...page(evidence.content) };
      if (evidence.outcome.kind === "retrieved") {
        const blob = await ctx.storage.get(evidence.outcome.storageId);
        if (!blob)
          throw new ConvexError(
            `Retrieved content unavailable for evidence ${evidence._id}. Retry retrieval or use another source.`,
          );
        const content = await blob.text();
        return { ...result, ...page(content) };
      }
    }
    return result;
  },
});
export const researchWrite = action({
  args: { token: v.string(), command: writeResearchCommand },
  returns: publicRunResult,
  handler: async (
    ctx,
    { token, command },
  ): Promise<Awaited<ReturnType<typeof writeOwned>>> => {
    const subject = await verify(token);
    return ctx.runMutation(internal.research.writeFromMcp, {
      subject,
      command,
    });
  },
});

export const sources = action({
  args: { token: v.string(), command: sourceCommand },
  returns: sourceResult,
  handler: async (
    ctx,
    { token, command },
  ): Promise<Infer<typeof sourceResult>> => {
    const subject = await verify(token);
    return ctx.runAction(internal.sourceActions.execute, { subject, command });
  },
});

export const discoveryRead = action({
  args: { token: v.string(), projectId: v.string() },
  handler: async (
    ctx,
    { token, projectId },
  ): Promise<Awaited<ReturnType<typeof import("./discovery").readOwned>>> => {
    const subject = await verify(token);
    return ctx.runQuery(internal.discovery.readFromMcp, { subject, projectId });
  },
});
export const discoveryWrite = action({
  args: { token: v.string(), command: discoveryCommand },
  returns: v.string(),
  handler: async (ctx, { token, command }): Promise<string> => {
    const subject = await verify(token);
    return ctx.runMutation(internal.discovery.writeFromMcp, {
      subject,
      command,
    });
  },
});
