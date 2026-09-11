"use node";
import { createHmac, timingSafeEqual } from "node:crypto";
import { v } from "convex/values";
import { z } from "zod";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { defaultDiscovery } from "./model/discoveryContracts";
import {
  exaMonitorRequest,
  remoteMonitor,
  remoteRun,
  outputSchema,
  parseCandidates,
} from "./model/monitorExa";

export function verifySignature(
  body: string,
  header: string,
  secret: string,
  now = Date.now(),
) {
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.trim().split("=")),
  );
  if (
    !/^\d+$/.test(parts.t ?? "") ||
    Math.abs(now / 1000 - Number(parts.t)) > 300 ||
    !/^[a-f0-9]{64}$/.test(parts.v1 ?? "")
  )
    return false;
  const expected = createHmac("sha256", secret)
    .update(`${parts.t}.${body}`)
    .digest("hex");
  return timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}
export const sync = internalAction({
  args: { monitorId: v.id("monitors") },
  handler: async (ctx, { monitorId }): Promise<void> => {
    const generation = await ctx.runMutation(internal.monitorState.claim, {
      monitorId,
    });
    if (generation === null) return;
    try {
      let {
        monitor: m,
        project,
        domains,
      } = await ctx.runQuery(internal.monitorState.get, { monitorId });
      let config = project.discovery ?? defaultDiscovery;
      if (m.removed && !m.remoteId && !m.creationAttempted) {
        await ctx.runMutation(internal.monitorState.finish, {
          monitorId,
          generation,
          providerStatus: "removed",
        });
        return;
      }
      if (!m.remoteId) {
        if (
          !(await ctx.runMutation(internal.monitorState.markCreation, {
            monitorId,
          }))
        )
          throw new Error(
            "Creation outcome uncertain. Operator must reconcile Exa metadata relayMonitorId and recover or remove the remote monitor; signing secrets cannot be fetched again. No duplicate was created.",
          );
        const created = remoteMonitor.parse(
          await exaMonitorRequest("", "POST", {
            name: m.name,
            search: {
              query: m.query,
              numResults: 10,
              ...(m.domains.length
                ? { includeDomains: m.domains }
                : config.scope === "websites"
                  ? { includeDomains: domains }
                  : {}),
            },
            metadata: { relayMonitorId: monitorId },
            webhook: {
              url: `${process.env.CONVEX_SITE_URL}/exa-monitor`,
              events: ["monitor.run.completed"],
            },
            outputSchema,
          }),
        );
        if (!created.webhookSecret)
          throw new Error(
            "Exa did not return its one-time webhook secret. Operator reconciliation required.",
          );
        await ctx.runMutation(internal.monitorState.accepted, {
          monitorId,
          remoteId: created.id,
          secret: created.webhookSecret,
        });
        ({
          monitor: m,
          project,
          domains,
        } = await ctx.runQuery(internal.monitorState.get, { monitorId }));
      }
      config = project.discovery ?? defaultDiscovery;
      const remoteId = m.remoteId;
      if (!remoteId) throw new Error("Remote monitor missing");
      const path = `/${encodeURIComponent(remoteId)}`;
      if (m.removed) {
        await exaMonitorRequest(path, "DELETE");
        await ctx.runMutation(internal.monitorState.finish, {
          monitorId,
          generation,
          providerStatus: "removed",
        });
        return;
      }
      const selected = m.domains.length
        ? m.domains
        : config.scope === "websites"
          ? domains
          : [];
      if (config.scope === "websites" && !selected.length) {
        await exaMonitorRequest(path, "PATCH", {
          status: "paused",
          trigger: null,
        });
        throw new Error(
          "Selected websites scope needs at least one website domain. Provider collection paused.",
        );
      }
      const remote = remoteMonitor.parse(
        await exaMonitorRequest(path, "PATCH", {
          name: m.name,
          status: m.paused ? "paused" : "active",
          trigger:
            config.cadence === "daily"
              ? { type: "interval", period: "1d" }
              : null,
          search: {
            query: [
              m.query,
              `Discovery brief: ${config.brief}`,
              `Region: ${config.region}; language: ${config.language}`,
            ].join("\n"),
            includeDomains: selected,
            numResults: 10,
            contents: { summary: true, maxAgeHours: 24 },
          },
          outputSchema,
        }),
      );
      if (remote.id !== remoteId) throw new Error("Provider monitor mismatch");
      await ctx.runMutation(internal.monitorState.finish, {
        monitorId,
        generation,
        providerStatus: remote.status,
        ...(remote.nextRunAt
          ? { nextCheck: Date.parse(remote.nextRunAt) }
          : {}),
        ...(remote.status === "disabled"
          ? {
              error:
                "Exa disabled this monitor. Check credentials and account health.",
            }
          : {}),
      });
    } catch (e) {
      await ctx.runMutation(internal.monitorState.finish, {
        monitorId,
        generation,
        error:
          e instanceof Error ? e.message : "Monitor reconciliation failed.",
      });
    }
  },
});
export const check = internalAction({
  args: { checkId: v.id("monitorChecks") },
  handler: async (ctx, a): Promise<void> => {
    const monitor = await ctx.runMutation(internal.monitorState.claimCheck, a);
    if (!monitor?.remoteId) return;
    try {
      await exaMonitorRequest(
        `/${encodeURIComponent(monitor.remoteId)}/trigger`,
        "POST",
      );
    } catch (e) {
      await ctx.runMutation(internal.monitorState.deliveryError, {
        monitorId: monitor._id,
        error:
          e instanceof Error
            ? e.message
            : "Manual check failed; reconcile before issuing another paid check.",
      });
    }
  },
});
export const webhook = internalAction({
  args: { body: v.string(), signature: v.string() },
  handler: async (ctx, a): Promise<number> => {
    const event = z
      .object({
        id: z.string(),
        type: z.literal("monitor.run.completed"),
        data: z.object({ id: z.string(), monitorId: z.string() }),
      })
      .safeParse(JSON.parse(a.body));
    if (!event.success) return 400;
    const m = await ctx.runQuery(internal.monitorState.byRemote, {
      remoteId: event.data.data.monitorId,
    });
    if (!m?.secret || !verifySignature(a.body, a.signature, m.secret))
      return 401;
    try {
      const run = remoteRun.parse(
        await exaMonitorRequest(
          `/${encodeURIComponent(event.data.data.monitorId)}/runs/${encodeURIComponent(event.data.data.id)}`,
        ),
      );
      if (run.monitorId !== m.remoteId || run.id !== event.data.data.id)
        return 400;
      if (!["completed", "failed", "cancelled"].includes(run.status))
        return 503;
      await ctx.runMutation(internal.discovery.ingest, {
        monitorId: m._id,
        remoteId: run.monitorId,
        runId: run.id,
        at: Date.parse(run.completedAt ?? run.updatedAt),
        status: run.status,
        ...(run.failReason ? { reason: run.failReason } : {}),
        candidates: parseCandidates(run),
      });
      await ctx.scheduler.runAfter(0, internal.monitorState.enqueue, {
        monitorId: m._id,
      });
      return 200;
    } catch {
      await ctx.runMutation(internal.monitorState.deliveryError, {
        monitorId: m._id,
        error:
          "Webhook run retrieval or candidate validation failed. Delivery can be retried safely.",
      });
      return 503;
    }
  },
});

export const collect = internalAction({
  args: { monitorId: v.id("monitors") },
  handler: async (ctx, { monitorId }): Promise<void> => {
    const { monitor } = await ctx.runQuery(internal.monitorState.get, {
      monitorId,
    });
    if (monitor.removed || !monitor.remoteId || monitor.sync !== "ready")
      return;
    const remoteId = monitor.remoteId;
    const path = `/${encodeURIComponent(remoteId)}`;
    try {
      const runs = z
        .object({ data: z.array(remoteRun) })
        .parse(await exaMonitorRequest(`${path}/runs?limit=100`));
      for (const run of runs.data) {
        if (
          await ctx.runQuery(internal.monitorState.hasDelivery, {
            monitorId,
            runId: run.id,
          })
        )
          continue;
        if (!["completed", "failed", "cancelled"].includes(run.status))
          continue;
        const full = remoteRun.parse(
          await exaMonitorRequest(`${path}/runs/${encodeURIComponent(run.id)}`),
        );
        if (full.monitorId !== remoteId)
          throw new Error("Provider run mapping mismatch");
        await ctx.runMutation(internal.discovery.ingest, {
          monitorId,
          remoteId,
          runId: full.id,
          status: full.status,
          ...(full.failReason ? { reason: full.failReason } : {}),
          at: Date.parse(full.completedAt ?? full.updatedAt),
          candidates: parseCandidates(full),
        });
      }
    } catch (error) {
      await ctx.runMutation(internal.monitorState.deliveryError, {
        monitorId,
        error:
          error instanceof Error
            ? error.message
            : "Collection reconciliation failed.",
      });
    }
  },
});
