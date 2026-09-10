"use node";
import type { readOwned, writeOwned } from "./research";
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
  ): Promise<Awaited<ReturnType<typeof readOwned>>> => {
    const subject = await verify(token);
    return ctx.runQuery(internal.research.readFromMcp, {
      subject,
      command,
    });
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
