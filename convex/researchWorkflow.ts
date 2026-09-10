import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
export const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: { maxParallelism: 4, retryActionsByDefault: false },
});
export const execute = workflow
  .define({ args: { runId: v.id("researchRuns") }, returns: v.null() })
  .handler(async (step, args): Promise<null> => {
    // Every iteration is a journaled action separated by a durable timer, not a held-open request.
    for (let i = 0; i < 125; i++) {
      const next = await step.runAction(
        internal.researchActions.advance,
        args,
        { retry: false },
      );
      if (next === "done") return null;
      if (next !== "continue")
        await step.sleep(next === "retry" ? 30_000 : 15_000);
    }
    await step.runMutation(internal.researchSteps.fail, {
      ...args,
      reason:
        "Polling limit reached. Recover this run to retrieve existing results.",
    });
    return null;
  });
