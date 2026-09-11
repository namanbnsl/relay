import { v } from "convex/values";
import { z } from "zod";

export const discoveryConfig = v.object({
  brief: v.string(),
  region: v.string(),
  language: v.string(),
  scope: v.union(v.literal("websites"), v.literal("web")),
  cadence: v.union(v.literal("manual"), v.literal("daily")),
  candidates: v.union(v.literal("suggest"), v.literal("automatic")),
});
export const frequency = v.union(
  v.object({ kind: v.literal("once") }),
  v.object({
    kind: v.literal("daily"),
    time: v.string(),
    timezone: v.string(),
    paused: v.boolean(),
  }),
);
export const defaultDiscovery = {
  brief: "",
  region: "",
  language: "",
  scope: "web",
  cadence: "manual",
  candidates: "suggest",
} satisfies typeof discoveryConfig.type;
export const discoveryCommand = v.union(
  v.object({
    kind: v.literal("configure_discovery"),
    projectId: v.string(),
    config: discoveryConfig,
  }),
  v.object({
    kind: v.literal("save_brief"),
    topicId: v.string(),
    title: v.string(),
    question: v.string(),
    angle: v.string(),
    coverage: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("archived"),
    ),
    frequency,
  }),
  v.object({
    kind: v.literal("save_monitor"),
    projectId: v.string(),
    requestKey: v.string(),
    monitorId: v.optional(v.string()),
    name: v.string(),
    query: v.string(),
    domains: v.array(v.string()),
    paused: v.boolean(),
  }),
  v.object({
    kind: v.literal("monitor_action"),
    monitorId: v.string(),
    requestKey: v.optional(v.string()),
    action: v.union(
      v.literal("pause"),
      v.literal("resume"),
      v.literal("remove"),
      v.literal("sync"),
      v.literal("check"),
    ),
  }),
  v.object({ kind: v.literal("dismiss_update"), updateId: v.string() }),
  v.object({
    kind: v.literal("attach_update"),
    updateId: v.string(),
    topicId: v.string(),
  }),
  v.object({
    kind: v.literal("topic_from_update"),
    updateId: v.string(),
    title: v.string(),
    question: v.string(),
    angle: v.string(),
  }),
  v.object({
    kind: v.literal("follow_up"),
    topicId: v.string(),
    requestKey: v.string(),
    title: v.string(),
    question: v.string(),
  }),
  v.object({
    kind: v.literal("finish_investigation"),
    investigationId: v.string(),
    expectedRevision: v.number(),
    outcome: v.union(v.literal("updated"), v.literal("no_material_update")),
    explanation: v.string(),
  }),
);
const id = z.string().min(1).max(128);
export const discoveryInput = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("configure_discovery"),
    projectId: id,
    config: z.object({
      brief: z.string().max(12000),
      region: z.string().max(100),
      language: z.string().max(100),
      scope: z.enum(["websites", "web"]),
      cadence: z.enum(["manual", "daily"]),
      candidates: z.enum(["suggest", "automatic"]),
    }),
  }),
  z.object({
    kind: z.literal("save_brief"),
    topicId: id,
    title: z.string().trim().min(1).max(160),
    question: z.string().trim().min(1).max(12000),
    angle: z.string().max(8000),
    coverage: z.string().max(12000),
    status: z.enum(["active", "completed", "archived"]),
    frequency: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("once") }),
      z.object({
        kind: z.literal("daily"),
        time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        timezone: z.string().min(1).max(100),
        paused: z.boolean(),
      }),
    ]),
  }),
  z.object({
    kind: z.literal("save_monitor"),
    projectId: id,
    requestKey: id,
    monitorId: id.optional(),
    name: z.string().trim().min(1).max(160),
    query: z.string().trim().min(1).max(4000),
    domains: z.array(z.string().min(1).max(253)).max(30),
    paused: z.boolean(),
  }),
  z.object({
    kind: z.literal("monitor_action"),
    monitorId: id,
    requestKey: id.optional(),
    action: z.enum(["pause", "resume", "remove", "sync", "check"]),
  }),
  z.object({ kind: z.literal("dismiss_update"), updateId: id }),
  z.object({ kind: z.literal("attach_update"), updateId: id, topicId: id }),
  z.object({
    kind: z.literal("topic_from_update"),
    updateId: id,
    title: z.string().trim().min(1).max(160),
    question: z.string().trim().min(1).max(12000),
    angle: z.string().max(8000),
  }),
  z.object({
    kind: z.literal("follow_up"),
    topicId: id,
    requestKey: id,
    title: z.string().trim().min(1).max(160),
    question: z.string().trim().min(1).max(12000),
  }),
  z.object({
    kind: z.literal("finish_investigation"),
    investigationId: id,
    expectedRevision: z.number().int().nonnegative(),
    outcome: z.enum(["updated", "no_material_update"]),
    explanation: z.string().trim().min(20).max(8000),
  }),
]);
export const candidate = v.object({
  title: v.string(),
  question: v.string(),
  angle: v.string(),
  explanation: v.string(),
  links: v.array(v.string()),
});
export const investigationState = v.union(
  v.object({ kind: v.literal("provider"), runId: v.id("researchRuns") }),
  v.object({
    kind: v.literal("waiting_for_agent"),
    runId: v.id("researchRuns"),
  }),
  v.object({ kind: v.literal("unavailable"), reason: v.string() }),
  v.object({
    kind: v.literal("closed"),
    outcome: v.union(v.literal("updated"), v.literal("no_material_update")),
    explanation: v.string(),
    revision: v.number(),
    at: v.number(),
  }),
);
