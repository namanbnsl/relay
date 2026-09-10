import { afterEach, expect, it, vi } from "vitest";
import { waitForResearch } from "../lib/research-tool-results";

afterEach(() => vi.useRealTimers());

it("waits at bounded intervals and returns when evidence completes", async () => {
  vi.useFakeTimers();
  const read = vi
    .fn()
    .mockResolvedValueOnce("running")
    .mockResolvedValueOnce("running")
    .mockResolvedValue("complete");
  const result = waitForResearch({
    read,
    isPending: (status) => status === "running",
    waitSeconds: 20,
  });
  await vi.advanceTimersByTimeAsync(3999);
  expect(read).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(4001);
  await expect(result).resolves.toBe("complete");
  expect(read).toHaveBeenCalledTimes(3);
  expect(vi.getTimerCount()).toBe(0);
});

it("caps unchanged polling at twenty seconds even if asked to wait longer", async () => {
  vi.useFakeTimers();
  const read = vi.fn(async () => "running");
  const result = waitForResearch({
    read,
    isPending: () => true,
    waitSeconds: 120,
  });
  await vi.advanceTimersByTimeAsync(20000);
  await expect(result).resolves.toBe("running");
  expect(read).toHaveBeenCalledTimes(6);
  expect(vi.getTimerCount()).toBe(0);
});

it("stops waiting on client cancellation without starting another read", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const read = vi.fn(async () => "running");
  const result = waitForResearch({
    read,
    isPending: () => true,
    waitSeconds: 20,
    signal: controller.signal,
  });
  await vi.advanceTimersByTimeAsync(1000);
  controller.abort();
  await expect(result).resolves.toBe("running");
  expect(read).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

it("returns immediately for completed work or a zero wait", async () => {
  const read = vi.fn(async () => "complete");
  await expect(
    waitForResearch({ read, isPending: () => false, waitSeconds: 20 }),
  ).resolves.toBe("complete");
  await expect(
    waitForResearch({ read, isPending: () => true, waitSeconds: 0 }),
  ).resolves.toBe("complete");
  expect(read).toHaveBeenCalledTimes(2);
});

it("keeps the public save schema compatible while requiring revisions for new findings", async () => {
  const { researchSaveInput } = await import("../convex/model/draftContracts");
  const common = { topicId: "topic", summary: "Sourced research" };
  const findings = [
    {
      id: "f1",
      text: "Claim",
      assessment: "supported",
      note: "",
      evidenceIds: ["evidence"],
    },
  ];
  const claims = [
    {
      text: "Claim",
      assessment: "supported",
      note: "",
      evidence: [
        {
          url: "https://example.org/source",
          title: "Source",
          excerpt: "Historical passage",
        },
      ],
    },
  ];
  expect(
    researchSaveInput.safeParse({ ...common, expectedRevision: 0, findings })
      .success,
  ).toBe(true);
  expect(researchSaveInput.safeParse({ ...common, claims }).success).toBe(true);
  expect(researchSaveInput.safeParse({ ...common, findings }).success).toBe(
    false,
  );
  expect(
    researchSaveInput.safeParse({
      ...common,
      expectedRevision: 0,
      findings,
      claims,
    }).success,
  ).toBe(false);
});
