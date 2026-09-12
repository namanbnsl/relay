// Isolated browser fixture only. Never imported by Next.js or production routes.
import { getFunctionName } from "convex/server";
import { useSyncExternalStore } from "react";
const listeners = new Set();
const mode = new URLSearchParams(location.search).get("state") ?? "updates";
export const topic = {
  _id: "topic_fixture",
  _creationTime: 1789120000000,
  projectId: "workspace_fixture",
  title: "Can an open model replace a paid AI subscription?",
  question: "What trade-offs emerge across everyday work and deployment costs?",
  angle: "A practical comparison for individual creators",
  coverage: "Quality, cost, privacy, and deployment limits",
  frequency: {
    kind: "daily",
    time: "09:00",
    timezone: "Asia/Kolkata",
    paused: true,
  },
  status: "active",
};
const update = {
  _id: "update_fixture",
  _creationTime: 1789120000000,
  projectId: "workspace_fixture",
  title: "A new open model changes the cost comparison",
  question: "Can the new model replace a paid subscription?",
  angle: "Real-world costs",
  explanation:
    "The release introduces a smaller model and new evaluation results. Compare the published claims with independent evidence before choosing a video angle.",
  links: [
    "https://example.org/model-release",
    "https://example.com/evaluations",
  ],
  monitorIds: ["monitor_fixture"],
  discoveredAt: 1789120000000,
  updatedAt: 1789120900000,
  dismissed: false,
};
const reviewResearch = {
  _id: "research_fixture",
  _creationTime: 1789120000000,
  topicId: topic._id,
  draftRevision: 2,
  summary:
    "The cost comparison depends on workload, privacy needs, and the real effort of running a model.",
  findings: [
    {
      id: "finding_fixture",
      revision: 2,
      text: "Published benchmark results do not cover every everyday workflow.",
      assessment: "uncertain",
      note: "Independent workflow tests are still needed.",
      evidenceIds: [],
    },
  ],
  claims: [
    {
      text: "Published benchmark results do not cover every everyday workflow.",
      assessment: "uncertain",
      note: "Independent workflow tests are still needed.",
      evidence: [],
    },
  ],
  review: { kind: "pending" },
};
let state = {
  config: {
    brief:
      "Follow open-source models, evaluations, and deployment costs. Exclude unsourced benchmark claims.",
    region: "",
    language: "English",
    scope: "web",
    cadence: "manual",
    candidates: "suggest",
  },
  setup: {
    available: false,
    reason:
      "Exa monitoring unavailable. Operator configuration is required; sources can still be saved.",
  },
  monitors: [
    {
      _id: "monitor_fixture",
      projectId: "workspace_fixture",
      name: "Open model releases",
      query: "New open-source model releases and evaluations",
      domains: ["example.org"],
      paused: true,
      removed: false,
      generation: 1,
      sync: "unavailable",
      error: "Exa monitoring unavailable. Source settings are saved.",
      requestKey: "fixture-source",
    },
  ],
  updates: mode === "empty" ? [] : [update],
  investigations: [
    {
      _id: "investigation_fixture",
      topicId: topic._id,
      due: 1789120000000,
      state: { kind: "waiting_for_agent", runId: "run_fixture" },
    },
  ],
};
const subscribe = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};
export function useConvexAuth() {
  return { isAuthenticated: true, isLoading: false };
}
export function useConvexConnectionState() {
  return { isWebSocketConnected: true };
}
export function usePaginatedQuery() {
  return { results: [], status: "Exhausted" };
}
const project = {
  _id: "workspace_fixture",
  name: "AI Explained",
  _creationTime: 1789120000000,
};
let topics = [topic];
export function useQuery(reference, args) {
  useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
  if (mode === "loading") return undefined;
  if (args === "skip") return undefined;
  const name = getFunctionName(reference);
  if (name === "relay:read") {
    if (args.command.kind === "projects")
      return { kind: "projects", projects: [project] };
    if (args.command.kind === "project")
      return { kind: "project", project, topics, topicStates: [] };
    return {
      kind: "topic",
      topic: topics.find((t) => t._id === args.command.topicId) ?? topic,
      research: mode === "review" ? [reviewResearch] : [],
      scripts: [],
      draft: null,
    };
  }
  if (name === "research:read")
    return { kind: "topic_runs", runs: [], setup: { kind: "ready" } };
  if (name === "discovery:topicContext")
    return { updates: state.updates, monitors: state.monitors };
  return state;
}
export function useMutation() {
  return async ({ command }) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    if (mode === "error") throw new Error("Fixture save failure");
    if (command.kind === "configure_discovery")
      state = { ...state, config: command.config };
    if (command.kind === "dismiss_update")
      state = {
        ...state,
        updates: state.updates.map((u) =>
          u._id === command.updateId ? { ...u, dismissed: true } : u,
        ),
      };
    if (command.kind === "topic_from_update")
      state = {
        ...state,
        updates: state.updates.map((u) => ({
          ...u,
          createdTopicId: topic._id,
        })),
      };
    if (command.kind === "save_brief")
      topics = topics.map((t) =>
        t._id === command.topicId ? { ...t, ...command } : t,
      );
    if (command.kind === "save_schedule")
      topics = topics.map((t) =>
        t._id === command.topicId
          ? {
              ...t,
              frequency: command.frequency,
              nextResearchAt:
                command.frequency.kind === "scheduled"
                  ? command.frequency.at
                  : undefined,
            }
          : t,
      );
    if (command.kind === "create_topic")
      topics = [
        ...topics,
        { ...topic, ...command, _id: `topic_${topics.length}` },
      ];
    if (command.kind === "save_monitor") {
      const monitor = {
        ...command,
        _id: command.monitorId ?? `monitor_${state.monitors.length}`,
        removed: false,
        sync: "ready",
      };
      state = {
        ...state,
        monitors: command.monitorId
          ? state.monitors.map((m) =>
              m._id === command.monitorId ? monitor : m,
            )
          : [...state.monitors, monitor],
      };
    }
    if (command.kind === "monitor_action")
      state = {
        ...state,
        monitors: state.monitors.map((m) =>
          m._id === command.monitorId
            ? {
                ...m,
                paused:
                  command.action === "pause"
                    ? true
                    : command.action === "resume"
                      ? false
                      : m.paused,
                removed: command.action === "remove",
              }
            : m,
        ),
      };
    state = { ...state };
    for (const notify of listeners) notify();
    if (command.kind === "create_topic")
      return { id: topics[topics.length - 1]._id };
    if (command.kind === "create_project") return { id: project._id };
    return topic._id;
  };
}
