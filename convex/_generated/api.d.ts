/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as mcp from "../mcp.js";
import type * as model_auth from "../model/auth.js";
import type * as model_draftContracts from "../model/draftContracts.js";
import type * as model_drafts from "../model/drafts.js";
import type * as model_exa from "../model/exa.js";
import type * as model_researchContracts from "../model/researchContracts.js";
import type * as model_validators from "../model/validators.js";
import type * as model_workflow from "../model/workflow.js";
import type * as relay from "../relay.js";
import type * as research from "../research.js";
import type * as researchActions from "../researchActions.js";
import type * as researchSteps from "../researchSteps.js";
import type * as researchWorkflow from "../researchWorkflow.js";
import type * as sourceActions from "../sourceActions.js";
import type * as sources from "../sources.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  mcp: typeof mcp;
  "model/auth": typeof model_auth;
  "model/draftContracts": typeof model_draftContracts;
  "model/drafts": typeof model_drafts;
  "model/exa": typeof model_exa;
  "model/researchContracts": typeof model_researchContracts;
  "model/validators": typeof model_validators;
  "model/workflow": typeof model_workflow;
  relay: typeof relay;
  research: typeof research;
  researchActions: typeof researchActions;
  researchSteps: typeof researchSteps;
  researchWorkflow: typeof researchWorkflow;
  sourceActions: typeof sourceActions;
  sources: typeof sources;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
};
