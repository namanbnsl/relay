import type { MutationCtx, QueryCtx } from "../_generated/server";

/** Returns the server-verified identity or rejects unauthenticated callers. */
export async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (identity === null) {
    throw new Error("Unauthenticated");
  }

  return identity;
}
