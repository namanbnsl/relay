"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ArrowRight, Check, Copy, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { ProjectFrame } from "./project-frame";
import { WorkspaceHeading } from "./workspace-ui";

type CopyState = "idle" | "copied" | "failed";
function CopyBlock({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<CopyState>("idle");
  return (
    <div className="mt-4 rounded-lg border border-border-strong bg-card p-4">
      <p className="whitespace-pre-wrap break-words font-mono text-xs leading-6 select-all">
        {value || "Loading workspace address…"}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={!value}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setState("copied");
            } catch {
              setState("failed");
            }
          }}
        >
          {state === "copied" ? <Check aria-hidden /> : <Copy aria-hidden />}
          {state === "copied" ? "Copied" : label}
        </Button>
        <span role="status" className="text-xs text-muted-foreground">
          {state === "copied"
            ? "Ready to paste into your agent."
            : state === "failed"
              ? "Copy unavailable. Select the text above and copy it manually."
              : ""}
        </span>
      </div>
    </div>
  );
}

const subscribeToOrigin = () => () => {};
const getEndpoint = () => `${window.location.origin}/mcp`;
const getServerEndpoint = () => "";

export function AgentOnboarding() {
  const endpoint = useSyncExternalStore(
    subscribeToOrigin,
    getEndpoint,
    getServerEndpoint,
  );
  const { isAuthenticated } = useConvexAuth();
  const activity = useQuery(api.mcpActivity.get, isAuthenticated ? {} : "skip");
  const clearTest = useMutation(api.mcpActivity.clearConnectionTest);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState("");
  const verified =
    activity?.lastSuccessfulReadAt != null &&
    activity.lastSuccessfulWriteAt != null;
  return (
    <ProjectFrame title="Connect your agent">
      <WorkspaceHeading
        title="A shared workspace for you and your agent"
        description="Connect once. Return here whenever you need the instructions."
      />
      <div className="max-w-[680px]">
        <div className="connection-notice">
          <Plug className="shrink-0 text-primary" size={20} aria-hidden />
          <p className="flex-1 text-sm leading-6">
            You’ll need an agent that supports remote MCP servers and OAuth
            sign-in. Use the same Relay account in both places.
          </p>
        </div>
        <ol>
          <li className="onboarding-step">
            <span className="step-number" aria-hidden>
              1
            </span>
            <section aria-labelledby="connect-title">
              <h2 id="connect-title" className="text-base font-semibold">
                Add Relay to your agent
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                In your agent’s connector or MCP settings, add a remote server
                named{" "}
                <strong className="font-medium text-foreground">Relay</strong>.
                Use this address and choose Streamable HTTP if a transport is
                requested.
              </p>
              <CopyBlock value={endpoint} label="Copy server address" />
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Follow the OAuth sign-in window to authorize access. Don’t paste
                passwords, API keys, or access tokens into a conversation.
              </p>
            </section>
          </li>
          <li className="onboarding-step">
            <span className="step-number" aria-hidden>
              2
            </span>
            <section aria-labelledby="test-title">
              <h2 id="test-title" className="text-base font-semibold">
                Test a read and a small write
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Start a conversation with Relay enabled, then send this prompt.
                It reads your projects and creates one removable connection
                marker. It does not create research or spend research-provider
                credits.
              </p>
              <CopyBlock
                label="Copy test prompt"
                value="Use Relay’s list_projects tool and report the project names (an empty list is fine). Then call test_connection to create a removable test marker. Do not start research or change other workspace data. Report any errors."
              />
              <div
                className="mt-4 rounded-lg border border-border bg-surface-subtle p-4"
                role="status"
                aria-live="polite"
              >
                <p className="flex items-center gap-2 text-sm font-medium">
                  {verified ? (
                    <Check size={16} className="text-primary" aria-hidden />
                  ) : (
                    <Plug size={16} aria-hidden />
                  )}
                  {!activity
                    ? "Checking observed activity…"
                    : verified
                      ? "Read and write access observed"
                      : "Waiting for your agent"}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {verified
                    ? "Relay observed successful authenticated MCP reads and writes for your account. These are past activity records, not a guarantee of a current connection."
                    : "Run the test prompt in your agent. This page updates when Relay observes successful activity; copying the prompt alone does not verify access."}
                </p>
                {activity ? (
                  <dl className="mt-3 grid gap-2 text-xs text-muted-foreground">
                    <div>
                      <dt className="inline font-medium">
                        Last successful read:{" "}
                      </dt>
                      <dd className="inline">
                        {formatActivity(activity.lastSuccessfulReadAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-medium">
                        Last successful write:{" "}
                      </dt>
                      <dd className="inline">
                        {formatActivity(activity.lastSuccessfulWriteAt)}
                      </dd>
                    </div>
                  </dl>
                ) : null}
              </div>
              {activity?.testMarker ? (
                <div className="mt-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    Your test marker is saved. Remove it to finish the
                    reversible test; your activity history stays available.
                  </p>
                  <Button
                    className="mt-3"
                    variant="outline"
                    disabled={clearing}
                    onClick={async () => {
                      setClearing(true);
                      setClearError("");
                      try {
                        await clearTest({});
                      } catch {
                        setClearError(
                          "Could not remove the marker. Check your connection and try again.",
                        );
                      } finally {
                        setClearing(false);
                      }
                    }}
                  >
                    {clearing ? "Removing…" : "Remove test marker"}
                  </Button>
                </div>
              ) : activity && verified ? (
                <p role="status" className="mt-3 text-xs text-muted-foreground">
                  No test marker remains in your workspace.
                </p>
              ) : null}
              {clearError ? (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {clearError}
                </p>
              ) : null}
              <p className="mt-4 text-xs leading-6 text-muted-foreground">
                You can repeat this prompt safely. To test again after
                reconnecting, watch for newer read and write times. You can also
                ask your agent to call remove_connection_test.
              </p>
            </section>
          </li>
          <li className="onboarding-step">
            <span className="step-number" aria-hidden>
              3
            </span>
            <section aria-labelledby="begin-title">
              <h2 id="begin-title" className="text-base font-semibold">
                Give your first question a home
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Create a project, then add a topic with a clear research
                question. The topic’s “Continue with agent” action gives you a
                prompt with the right context.
              </p>
              <Link href="/projects" className={`${buttonVariants()} mt-4`}>
                Go to projects
                <ArrowRight aria-hidden />
              </Link>
            </section>
          </li>
        </ol>
        <details className="mt-4 border-t border-border py-5">
          <summary className="min-h-8 cursor-pointer text-sm font-medium">
            Having trouble connecting?
          </summary>
          <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
            <p>
              <strong className="text-foreground">No sign-in window?</strong>{" "}
              Check that your agent supports OAuth for remote MCP, and reconnect
              the server. A local-only MCP client cannot use this address
              directly.
            </p>
            <p>
              <strong className="text-foreground">
                Wrong projects or access denied?
              </strong>{" "}
              Sign out of the connector and authorize again with the account you
              use in Relay.
            </p>
            <p>
              <strong className="text-foreground">Tools missing?</strong>{" "}
              Refresh your agent’s tools or start a new conversation after
              connecting. You can repeat the read prompt safely.
            </p>
            <p>
              Your agent supplies inference. A chat subscription does not
              necessarily include API access; check your agent or model
              provider’s requirements.
            </p>
          </div>
        </details>
      </div>
    </ProjectFrame>
  );
}

function formatActivity(at: number | null) {
  return at === null
    ? "Not observed yet"
    : new Date(at).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
}
