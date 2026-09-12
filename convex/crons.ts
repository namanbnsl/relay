import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval(
  "daily research dispatch",
  { minutes: 1 },
  internal.schedules.tick,
  {},
);
crons.interval(
  "monitor health reconciliation",
  { minutes: 5 },
  internal.monitorState.reconcileDue,
  {},
);
export default crons;
