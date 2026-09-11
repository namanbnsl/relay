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
export function useQuery(reference) {
  useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
  if (mode === "loading") return undefined;
  const name = getFunctionName(reference);
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
    for (const notify of listeners) notify();
    return topic._id;
  };
}
