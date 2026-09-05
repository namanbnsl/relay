import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  approveDraft,
  approveRun,
  canApprove,
  correctClaim,
  createDraft,
  createRun,
  discoveries,
  editDraft,
  initialTopics,
  isApproved,
  reviseRun,
} from "./workspace-model";

function sampleRun() {
  const discovery = discoveries.find((item) => item.id === "permissions");
  assert.ok(discovery);
  return createRun({ id: "test-run", date: "September 5", discovery });
}

describe("research and draft review", () => {
  it("blocks approval and draft creation until a disputed claim is corrected", () => {
    const run = sampleRun();
    assert.equal(canApprove(run), false);
    assert.equal(isApproved(approveRun(run)), false);
    assert.equal(
      createDraft({
        run,
        title: "Test",
        format: "whatsapp",
        ending: "Takeaway",
      }).drafts.whatsapp,
      null,
    );
    const corrected = correctClaim(run, "benchmark");
    assert.equal(corrected.version, 2);
    assert.equal(canApprove(corrected), true);
    assert.match(
      corrected.claims.find((item) => item.id === "benchmark")?.text ?? "",
      /developer productivity was not measured/,
    );
    assert.equal(
      run.claims.find((item) => item.id === "benchmark")?.review.kind,
      "disputed",
    );
  });

  it("preserves approved evidence when the brief is edited and prevents stale draft approval", () => {
    const approved = approveRun(correctClaim(sampleRun(), "benchmark"));
    const withDraft = createDraft({
      run: approved,
      title: "Test",
      format: "whatsapp",
      ending: "Takeaway",
    });
    const draft = withDraft.drafts.whatsapp;
    assert.ok(draft);
    const reviewedDraft = approveDraft(withDraft, draft);
    assert.equal(reviewedDraft.approvals.length, 1);
    const changed = reviseRun(
      {
        ...withDraft,
        drafts: { ...withDraft.drafts, whatsapp: reviewedDraft },
      },
      { summary: "A revised conclusion.", claims: withDraft.claims },
    );
    assert.equal(isApproved(changed), false);
    assert.equal(changed.approvals[0].summary, approved.summary);
    assert.equal(
      approveDraft(changed, editDraft(draft, "New wording")).approvals.length,
      0,
    );
    const current = approveRun(changed);
    assert.equal(
      approveDraft(current, editDraft(draft, "New wording")).approvals.length,
      0,
    );
    const rebuilt = createDraft({
      run: current,
      title: "Test",
      format: "whatsapp",
      ending: "New takeaway",
    });
    assert.equal(rebuilt.drafts.whatsapp?.researchVersion, current.version);
    assert.match(rebuilt.drafts.whatsapp?.text ?? "", /A revised conclusion/);
    assert.equal(
      rebuilt.drafts.whatsapp?.approvals[0].text,
      reviewedDraft.text,
    );
    assert.notEqual(rebuilt.drafts.whatsapp?.version, reviewedDraft.version);
  });

  it("keeps approval attached to the old draft when wording changes", () => {
    const run = createDraft({
      run: approveRun(correctClaim(sampleRun(), "benchmark")),
      title: "Test",
      format: "script",
      ending: "End",
    });
    const draft = run.drafts.script;
    assert.ok(draft);
    const approved = approveDraft(run, draft);
    const changed = editDraft(approved, "Edited script");
    assert.equal(changed.version, 2);
    assert.equal(
      changed.approvals.some((item) => item.version === changed.version),
      false,
    );
    assert.equal(changed.approvals[0].text, draft.text);
    assert.equal(editDraft(changed, changed.text), changed);
  });

  it("keeps daily runs independent and refuses an empty brief", () => {
    const topic = initialTopics.find((item) => item.id === "coding-agents");
    assert.ok(topic);
    const original = JSON.stringify(topic);
    const next = {
      ...topic,
      runs: [...topic.runs, approveRun(correctClaim(sampleRun(), "benchmark"))],
    };
    assert.equal(next.runs.length, 2);
    assert.equal(JSON.stringify(topic), original);
    assert.equal(next.runs[0], topic.runs[0]);
    const empty = createRun({ id: "empty", date: "Today", discovery: null });
    assert.equal(canApprove(empty), false);
    assert.equal(isApproved(approveRun(empty)), false);
  });
});
