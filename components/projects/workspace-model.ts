export function createWorkspaceId(): string {
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), (value) =>
    value.toString(16).padStart(8, "0"),
  ).join("");
}

export type Claim = {
  id: string;
  text: string;
  source: string;
  excerpt: string;
  review:
    | { kind: "supported"; note: string }
    | { kind: "disputed"; note: string; correction: string };
};

export type Snapshot = { version: number; summary: string; claims: Claim[] };
export type Draft = {
  text: string;
  version: number;
  researchVersion: number;
  approvals: { version: number; text: string; researchVersion: number }[];
};
export type Run = Snapshot & {
  id: string;
  date: string;
  change: string;
  approvals: Snapshot[];
  drafts: { whatsapp: Draft | null; script: Draft | null };
};
export type Topic = {
  id: string;
  title: string;
  question: string;
  cadence: "daily" | "one-time";
  outline: string;
  runs: Run[];
};
export type Discovery = {
  id: string;
  title: string;
  question: string;
  summary: string;
  why: string;
  source: string;
  category: "Development" | "Research idea";
  claims: Claim[];
};

export const discoveries: Discovery[] = [
  {
    id: "permissions",
    title: "Coding agents and permission creep",
    question: "Which permissions should a team grant its coding agent?",
    summary:
      "Task-scoped access, shared policies, and a performance claim worth checking.",
    why: "A practical question for developers adopting agents at work: what to allow, what to review, and what to keep restricted.",
    source: "Release notes · Benchmark appendix",
    category: "Development",
    claims: [
      {
        id: "permissions",
        text: "The sample release lets teams approve network access for an individual task.",
        source: "Sample release notes · September 5",
        excerpt:
          "Network access can be granted for a single task. The permission expires when that task ends.",
        review: {
          kind: "supported",
          note: "The release notes explicitly describe task-scoped access. This does not establish how every agent handles permissions.",
        },
      },
      {
        id: "benchmark",
        text: "The new permission system makes developers 40% faster.",
        source: "Sample benchmark appendix · September 5",
        excerpt:
          "In 20 internal repository tasks, median agent completion time fell by 40%. Human developer productivity was not measured.",
        review: {
          kind: "disputed",
          note: "Agent task duration is not developer productivity. The result also comes from a small internal benchmark.",
          correction:
            "In 20 internal tasks, the vendor reports 40% lower median agent completion time; developer productivity was not measured.",
        },
      },
      {
        id: "policy",
        text: "Teams can share a repository-level permission policy.",
        source: "Sample release notes · September 5",
        excerpt:
          "A repository policy file lets maintainers specify the tools and network destinations available to the agent.",
        review: {
          kind: "supported",
          note: "The source supports shared configuration. It does not demonstrate that the policy is sufficient for every security requirement.",
        },
      },
    ],
  },
  {
    id: "costs",
    title: "The real cost of a coding agent",
    question:
      "How should a small team compare the total cost of coding agents?",
    summary:
      "Explore how retries, context size, and tool calls affect the cost of finishing a task.",
    why: "Help your audience compare the cost of completed work, rather than headline token prices.",
    source: "Research idea",
    category: "Research idea",
    claims: [],
  },
  {
    id: "local",
    title: "Where local models fit",
    question: "Which everyday coding tasks are a good fit for local models?",
    summary:
      "A focused comparison of code explanation, small edits, and changes across a repository.",
    why: "A useful follow-up for readers weighing privacy, hardware requirements, and quality.",
    source: "Research idea",
    category: "Research idea",
    claims: [],
  },
];

export const initialTopics: Topic[] = [
  {
    id: "coding-agents",
    title: "AI coding agents",
    question: "Which product changes matter to working software teams?",
    cadence: "daily",
    outline:
      "Permissions and team controls\nEvidence behind performance claims\nPractical implications for developers",
    runs: [
      {
        id: "baseline",
        date: "September 4, 2026",
        change: "Baseline brief",
        version: 1,
        summary:
          "This sample baseline establishes the questions to track: task permissions, shared team controls, and the evidence behind performance claims.",
        claims: [],
        approvals: [],
        drafts: { whatsapp: null, script: null },
      },
    ],
  },
  {
    id: "local-models",
    title: "Local models for small teams",
    question: "When does running a model locally make sense?",
    cadence: "one-time",
    outline:
      "Tasks and quality requirements\nHardware and operating costs\nPrivacy and maintenance",
    runs: [],
  },
];

export function createRun({
  id,
  date,
  discovery,
}: {
  id: string;
  date: string;
  discovery: Discovery | null;
}): Run {
  return {
    id,
    date,
    change: discovery ? discovery.title : "New investigation",
    version: 1,
    summary: discovery?.claims.length
      ? "The sample release adds task-scoped network access and a shared permission policy. The useful question for teams is how to grant access deliberately. Performance figures come from a small internal task benchmark, rather than a measurement of developer productivity."
      : "",
    claims: discovery?.claims ?? [],
    approvals: [],
    drafts: { whatsapp: null, script: null },
  };
}

export function reviseRun(
  run: Run,
  update: Pick<Run, "summary" | "claims">,
): Run {
  return { ...run, ...update, version: run.version + 1 };
}

export function canApprove(run: Run) {
  return (
    run.summary.trim().length > 0 &&
    run.claims.every((claim) => claim.review.kind === "supported")
  );
}

export function isApproved(run: Run) {
  return run.approvals.some((approval) => approval.version === run.version);
}

export function approveRun(run: Run): Run {
  if (!canApprove(run) || isApproved(run)) return run;
  return {
    ...run,
    approvals: [
      ...run.approvals,
      { version: run.version, summary: run.summary, claims: run.claims },
    ],
  };
}

export function correctClaim(run: Run, id: string): Run {
  const claim = run.claims.find((item) => item.id === id);
  if (!claim || claim.review.kind !== "disputed") return run;
  return reviseRun(run, {
    summary: run.summary,
    claims: run.claims.map((item) =>
      item.id === id
        ? {
            ...item,
            text:
              claim.review.kind === "disputed"
                ? claim.review.correction
                : claim.text,
            review: {
              kind: "supported",
              note: "Wording revised to match the sample evidence. Human review is still required.",
            },
          }
        : item,
    ),
  });
}

export function createDraft({
  run,
  title,
  format,
  ending,
}: {
  run: Run;
  title: string;
  format: "whatsapp" | "script";
  ending: string;
}): Run {
  const previous = run.drafts[format];
  if (!isApproved(run) || previous?.researchVersion === run.version) return run;
  const findings = run.claims.map((claim) => `• ${claim.text}`).join("\n");
  const sources = [...new Set(run.claims.map((claim) => claim.source))].join(
    "\n",
  );
  const text =
    format === "whatsapp"
      ? `*${title}*\n\n${run.summary}\n\n${findings}\n\n${ending}\n\nSources:\n${sources || "No sources attached. Add sources before sharing."}`
      : `TITLE\n${title}\n\nOPENING\n${run.summary}\n\nEXPLANATION\n${findings || "Add the findings you want to explain."}\n\nVISUAL PLAN\nShow each finding alongside its supporting source. Use a simple permission diagram for the sample release. No chart is planned without a suitable dataset.\n\nTAKEAWAY\n${ending}\n\nREFERENCES\n${sources || "Add supporting sources."}`;
  return {
    ...run,
    drafts: {
      ...run.drafts,
      [format]: {
        text,
        version: (previous?.version ?? 0) + 1,
        researchVersion: run.version,
        approvals: previous?.approvals ?? [],
      },
    },
  };
}

export function editDraft(draft: Draft, text: string): Draft {
  return text === draft.text
    ? draft
    : { ...draft, text, version: draft.version + 1 };
}

export function approveDraft(run: Run, draft: Draft): Draft {
  if (
    !isApproved(run) ||
    draft.researchVersion !== run.version ||
    !draft.text.trim() ||
    draft.approvals.some((item) => item.version === draft.version)
  )
    return draft;
  return {
    ...draft,
    approvals: [
      ...draft.approvals,
      {
        version: draft.version,
        text: draft.text,
        researchVersion: draft.researchVersion,
      },
    ],
  };
}
