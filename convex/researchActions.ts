"use node";
import { createHash } from "node:crypto";
import { v } from "convex/values";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  cancelExa,
  getContents,
  getExa,
  providerError,
  reconcileExa,
  sourceList,
  startExa,
  ProviderError,
} from "./model/exa";
import { isActive, settings } from "./model/researchContracts";
const args = { runId: v.id("researchRuns") };
async function cancel(ctx: ActionCtx, runId: Id<"researchRuns">) {
  let r = await ctx.runQuery(internal.research.owned, { runId });
  try {
    if (r.submission.kind === "uncertain") {
      const remoteId = await reconcileExa(runId);
      if (remoteId) {
        await ctx.runMutation(internal.researchSteps.accepted, {
          runId,
          remoteId,
        });
        r = await ctx.runQuery(internal.research.owned, { runId });
      }
    }
    if (r.submission.kind === "accepted") {
      const remote = await cancelExa(r.submission.remoteId);
      if (remote.id !== r.submission.remoteId)
        throw new ProviderError("provider_id_mismatch");
      await ctx.runMutation(internal.researchSteps.cancellation, {
        runId,
        terminal: ["completed", "failed", "cancelled"].includes(remote.status),
        outcome: `Provider returned ${remote.status}; accrued charges still apply.`,
        ...(remote.costDollars
          ? { actualDollars: remote.costDollars.total }
          : {}),
      });
    } else
      await ctx.runMutation(internal.researchSteps.cancellation, {
        runId,
        terminal: r.submission.kind === "not_submitted",
        outcome:
          r.submission.kind === "not_submitted"
            ? "No remote task submitted."
            : "Remote submission unresolved. Cancellation and charges are unknown; recover to reconcile.",
      });
  } catch (error) {
    await ctx.runMutation(internal.researchSteps.cancellation, {
      runId,
      terminal: false,
      outcome: `Remote cancellation unconfirmed (${providerError(error)}). Charges may continue. Recover or ask the operator to cancel in Exa.`,
    });
  }
}
export const cancelRemote = internalAction({
  args,
  returns: v.null(),
  handler: async (ctx, { runId }): Promise<void> => cancel(ctx, runId),
});
export const advance = internalAction({
  args,
  returns: v.union(
    v.literal("done"),
    v.literal("wait"),
    v.literal("retry"),
    v.literal("continue"),
  ),
  handler: async (
    ctx,
    { runId },
  ): Promise<"done" | "wait" | "retry" | "continue"> => {
    let r = await ctx.runQuery(internal.research.owned, { runId });
    if (!isActive(r.state)) {
      if (r.state.kind === "cancelled" && r.occupied) await cancel(ctx, runId);
      return "done";
    }
    if (Date.now() > r.deadline || settings().kind !== "ready") {
      await ctx.runMutation(internal.researchSteps.fail, {
        runId,
        reason:
          Date.now() > r.deadline
            ? "Overall deadline exceeded. Recover existing results."
            : "Provider execution disabled or not configured. Restore setup, then recover this run.",
      });
      await cancel(ctx, runId);
      return "done";
    }
    if (r.submission.kind === "not_submitted") {
      if (!(await ctx.runMutation(internal.researchSteps.claim, { runId })))
        return "wait";
      try {
        const remoteId = await startExa({
          brief: r.brief,
          effort: r.effort,
          runId,
        });
        await ctx.runMutation(internal.researchSteps.accepted, {
          runId,
          remoteId,
        });
      } catch (error) {
        if (
          error instanceof ProviderError &&
          /^provider_http_(400|401|403|422|429)$/.test(error.code)
        ) {
          await ctx.runMutation(internal.researchSteps.submissionRejected, {
            runId,
          });
          await ctx.runMutation(internal.researchSteps.fail, {
            runId,
            reason: `Exa rejected submission (${error.code}). Correct provider configuration or wait for capacity, then recover to retry.`,
          });
          return "done";
        }
        await ctx.runMutation(internal.researchSteps.fail, {
          runId,
          reason: `Submission outcome unknown (${providerError(error)}). Recover to reconcile Exa history; Relay will not submit again.`,
        });
        return "done";
      }
      return "wait";
    }
    if (r.submission.kind === "uncertain") {
      try {
        const remoteId = await reconcileExa(runId);
        if (!remoteId) throw new ProviderError("no_unique_history_match");
        await ctx.runMutation(internal.researchSteps.accepted, {
          runId,
          remoteId,
        });
      } catch (error) {
        await ctx.runMutation(internal.researchSteps.fail, {
          runId,
          reason: `Submission requires operator reconciliation (${providerError(error)}). No paid resubmission performed.`,
        });
        return "done";
      }
      r = await ctx.runQuery(internal.research.owned, { runId });
    }
    if (!r.packetId && r.submission.kind === "accepted") {
      try {
        const remote = await getExa(r.submission.remoteId);
        if (remote.id !== r.submission.remoteId)
          throw new ProviderError("provider_id_mismatch");
        const terminal = ["completed", "failed", "cancelled"].includes(
          remote.status,
        );
        await ctx.runMutation(internal.researchSteps.progress, {
          runId,
          stage: terminal ? "processing_results" : "provider_running",
          remoteTerminal: terminal,
          ...(terminal && remote.costDollars
            ? { actualDollars: remote.costDollars.total }
            : {}),
          ...(remote.usage ? { usageJson: JSON.stringify(remote.usage) } : {}),
        });
        if (!terminal) return "wait";
        const findings =
          remote.output?.text ||
          (remote.output?.structured
            ? JSON.stringify(remote.output.structured)
            : "");
        if (!findings.trim()) {
          await ctx.runMutation(internal.researchSteps.fail, {
            runId,
            reason: `Exa ${remote.status} without usable findings. Start a new run if needed.`,
          });
          return "done";
        }
        const sources = sourceList(remote);
        const gaps: string[] = [];
        if (remote.status !== "completed")
          gaps.push(`Provider execution ${remote.status}.`);
        if (remote.stopReason && remote.stopReason !== "schema_satisfied")
          gaps.push(`Provider stop reason: ${remote.stopReason}.`);
        if (!sources.length)
          gaps.push("Provider supplied no usable grounding URLs.");
        if (sources.length > 20)
          gaps.push(
            `${sources.length - 20} cited sources exceed the 20-source retrieval limit; see full provider output.`,
          );
        if (findings.length > 20000)
          gaps.push(
            "Compact findings truncated to 20,000 characters; full provider output is available separately.",
          );
        const grounding = JSON.stringify(remote.output?.grounding ?? []);
        if (grounding.length > 60000)
          gaps.push(
            "Compact grounding omitted due to size; see full provider output.",
          );
        const outputStorageId = await ctx.storage.store(
          new Blob(
            [
              JSON.stringify({
                output: remote.output,
                usage: remote.usage ?? null,
                costDollars: remote.costDollars ?? null,
                status: remote.status,
                stopReason: remote.stopReason ?? null,
              }),
            ],
            { type: "application/json" },
          ),
        );
        await ctx.runMutation(internal.researchSteps.storePacket, {
          packet: {
            runId,
            findings: findings.slice(0, 20000),
            outputStorageId,
            groundingJson: grounding.length <= 60000 ? grounding : "[]",
            gaps,
            createdAt: Date.now(),
            provenance: "exa_agent",
            verification: "not_independently_verified",
            approval: "not_reviewed",
            providerStatus: remote.status,
          },
          sources: sources.slice(0, 20).map((c) => ({
            url: c.url,
            ...(c.title ? { title: c.title } : {}),
          })),
        });
        return "continue";
      } catch (error) {
        // A transient status failure gets one retry after a durable 30-second backoff.
        await ctx.runMutation(internal.researchSteps.progress, {
          runId,
          stage: `status_error:${providerError(error)}`,
        });
        if (
          r.stage.startsWith("status_error:") ||
          !(error instanceof ProviderError && error.retryable)
        ) {
          await ctx.runMutation(internal.researchSteps.fail, {
            runId,
            reason: `Provider status/processing failed (${providerError(error)}). Recover the existing run.`,
          });
          return "done";
        }
        return "retry";
      }
    }
    const batch = await ctx.runQuery(internal.researchSteps.nextEvidence, {
      runId,
    });
    if (!batch.length) {
      await ctx.runMutation(internal.researchSteps.finish, { runId });
      return "done";
    }
    // Bound network concurrency to nextEvidence's four-source batch. Persist the
    // resulting snapshots in order so storage writes and their metadata stay paired.
    const fetched = await Promise.allSettled(
      batch.map(async (evidence) => {
        const claimed = await ctx.runMutation(
          internal.researchSteps.claimEvidence,
          {
            evidenceId: evidence._id,
          },
        );
        return claimed ? getContents(evidence.originalUrl) : null;
      }),
    );
    const outcomes: ("retry" | "continue")[] = [];
    for (const [index, evidence] of batch.entries()) {
      const fetchedResult = fetched[index];
      try {
        if (fetchedResult.status === "rejected") throw fetchedResult.reason;
        const content = fetchedResult.value;
        if (content === null) {
          if (evidence.attempts >= 2)
            await ctx.runMutation(internal.researchSteps.storeEvidence, {
              evidenceId: evidence._id,
              fields: {
                runId,
                originalUrl: evidence.originalUrl,
                canonicalUrl: evidence.canonicalUrl,
                attempts: evidence.attempts,
                outcome: {
                  kind: "failed",
                  at: Date.now(),
                  reason:
                    "Retrieval attempt limit reached; response may have been lost.",
                },
              },
            });
          continue;
        }
        const page = content.results[0];
        if (!page?.text?.trim())
          throw new ProviderError("source_content_unavailable");
        const storageId = await ctx.storage.store(
          new Blob([page.text], { type: "text/plain;charset=utf-8" }),
        );
        await ctx.runMutation(internal.researchSteps.storeEvidence, {
          evidenceId: evidence._id,
          fields: {
            runId,
            originalUrl: evidence.originalUrl,
            canonicalUrl: new URL(page.url).href,
            excerpt: page.text.slice(0, 8000),
            ...(page.title ? { title: page.title } : {}),
            ...(page.publishedDate
              ? {
                  publishedAt: page.publishedDate,
                  publicationProvenance: "exa_contents",
                }
              : {}),
            outcome: {
              kind: "retrieved",
              storageId,
              hash: createHash("sha256").update(page.text).digest("hex"),
              retrievedAt: Date.now(),
              characters: page.text.length,
            },
            attempts: evidence.attempts + 1,
          },
          ...(content.costDollars ? { cost: content.costDollars.total } : {}),
        });
      } catch (error) {
        if (
          evidence.attempts < 1 &&
          error instanceof ProviderError &&
          error.retryable
        ) {
          outcomes.push("retry");
          continue;
        }
        await ctx.runMutation(internal.researchSteps.storeEvidence, {
          evidenceId: evidence._id,
          fields: {
            runId,
            originalUrl: evidence.originalUrl,
            canonicalUrl: evidence.canonicalUrl,
            ...(evidence.title ? { title: evidence.title } : {}),
            attempts: evidence.attempts + 1,
            outcome: {
              kind: "failed",
              at: Date.now(),
              reason: providerError(error),
            },
          },
        });
      }
      outcomes.push("continue");
    }
    return outcomes.includes("retry") ? "retry" : "continue";
  },
});
