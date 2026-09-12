"use client";
import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import type { FunctionArgs } from "convex/server";
import { api } from "@/convex/_generated/api";
type Command = FunctionArgs<typeof api.discovery.write>["command"];
export function useCommand() {
  const mutate = useMutation(api.discovery.write);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const locked = useRef(false);
  async function run(command: Command) {
    if (locked.current) return null;
    locked.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const id = await mutate({ command });
      setMessage(
        command.kind === "save_schedule"
          ? "Schedule saved"
          : command.kind === "monitor_action" && command.action === "check"
            ? "Checking for updates…"
            : "Saved",
      );
      return id;
    } catch (e) {
      setError(
        e instanceof ConvexError && typeof e.data === "string"
          ? e.data
          : "Could not save. Try again.",
      );
      return null;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return {
    run,
    busy,
    feedback: (
      <>
        <p role="status" className="text-xs text-muted-foreground">
          {busy ? "Saving…" : message}
        </p>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </>
    ),
  };
}
