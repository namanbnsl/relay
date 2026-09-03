"use client";

import { useEffect, useState } from "react";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";

import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";

type SyncState = "syncing" | "ready" | "error";

function LoadingRows() {
  return (
    <div className="mt-9 grid gap-px overflow-hidden rounded-lg border border-border bg-border">
      {[0, 1, 2].map((row) => (
        <div className="bg-card p-5" key={row}>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-4 w-full max-w-[520px]" />
        </div>
      ))}
    </div>
  );
}

function SecretNotes() {
  const notes = useQuery(api.secrets.list);

  if (notes === undefined) {
    return <LoadingRows />;
  }

  return (
    <div className="mt-9 overflow-hidden rounded-lg border border-border bg-card">
      {notes.map((note) => (
        <article
          className="border-b border-border p-5 last:border-b-0 sm:grid sm:grid-cols-[160px_1fr] sm:gap-6"
          key={note._id}
        >
          <h2 className="font-semibold tracking-[-0.02em]">{note.title}</h2>
          <p className="mt-1 leading-6 text-muted-foreground sm:mt-0">
            {note.body}
          </p>
        </article>
      ))}
    </div>
  );
}

function AuthenticatedSecretData() {
  const syncCurrentUser = useMutation(api.users.syncCurrent);
  const [syncState, setSyncState] = useState<SyncState>("syncing");

  useEffect(() => {
    let isCurrent = true;

    syncCurrentUser({}).then(
      () => {
        if (isCurrent) setSyncState("ready");
      },
      () => {
        if (isCurrent) setSyncState("error");
      },
    );

    return () => {
      isCurrent = false;
    };
  }, [syncCurrentUser]);

  if (syncState === "error") {
    return (
      <p className="mt-9 rounded-lg border border-destructive bg-destructive-subtle p-5 leading-6 text-destructive">
        Convex could not verify this Clerk session. Confirm that the Clerk
        Convex integration and issuer domain are configured for this deployment.
      </p>
    );
  }

  if (syncState === "syncing") {
    return <LoadingRows />;
  }

  return <SecretNotes />;
}

export function SecretData() {
  return (
    <>
      <AuthLoading>
        <LoadingRows />
      </AuthLoading>
      <Authenticated>
        <AuthenticatedSecretData />
      </Authenticated>
      <Unauthenticated>
        <p className="mt-9 rounded-lg border border-border bg-card p-5 leading-6 text-muted-foreground">
          Convex is waiting for an authenticated Clerk session.
        </p>
      </Unauthenticated>
    </>
  );
}
