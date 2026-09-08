"use node";
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
  } catch (cause) {
    console.error("Clerk OAuth access token verification failed", cause);
    throw new Error("OAuth token verification failed", { cause });
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
  handler: async (ctx, { token, command }): Promise<Infer<typeof readResult>> =>
    ctx.runQuery(internal.relay.readFromMcp, {
      subject: await verify(token),
      command,
    }),
});
export const write = action({
  args: { token: v.string(), command: writeCommand },
  returns: writeResult,
  handler: async (
    ctx,
    { token, command },
  ): Promise<Infer<typeof writeResult>> =>
    ctx.runMutation(internal.relay.writeFromMcp, {
      subject: await verify(token),
      command,
    }),
});
