"use client";
import { UserButton } from "@clerk/nextjs";
import {
  useConvexAuth,
  useQuery,
  useConvexConnectionState,
} from "convex/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Folder, Layers2, Menu } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { workspacePageClass } from "./workspace-ui";

const subscribeToHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ProjectFrame({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const connection = useConvexConnectionState();
  // Connection state is browser-specific; keep the initial hydration text stable.
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot,
  );
  const { isAuthenticated } = useConvexAuth();
  const projects = useQuery(
    api.relay.read,
    isAuthenticated ? { command: { kind: "projects" } } : "skip",
  );
  return (
    <div className="research-workspace workspace-shell min-h-svh bg-background text-foreground">
      <a
        href="#project-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:bg-background"
      >
        Skip to content
      </a>
      <aside className="workspace-sidebar">
        <Link href="/projects" className="workspace-brand">
          <span className="workspace-mark">
            <Layers2 size={17} aria-hidden />
          </span>
          Relay
          <span className="ms-auto text-xs font-normal text-muted-foreground">
            Workspace
          </span>
        </Link>
        <nav aria-label="Workspace navigation">
          <Link
            className="workspace-nav-item"
            href="/projects"
            aria-current={pathname === "/projects" ? "page" : undefined}
          >
            <Folder size={16} aria-hidden />
            All workspaces
          </Link>
          <p className="mb-2 mt-8 px-2 text-xs font-medium text-muted-foreground">
            Workspaces
          </p>
          {projects?.kind === "projects"
            ? projects.projects.map((project) => (
                <Link
                  key={project._id}
                  href={`/projects/${project._id}`}
                  aria-current={
                    pathname === `/projects/${project._id}` ? "page" : undefined
                  }
                  className="workspace-nav-item"
                >
                  <span className="workspace-project-glyph">
                    {project.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 truncate" title={project.name}>
                    {project.name}
                  </span>
                </Link>
              ))
            : null}
        </nav>
        <details
          className="relative hidden max-[760px]:block"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <Menu size={18} aria-hidden />
            Menu
          </summary>
          <div className="absolute end-0 top-12 z-40 w-56 rounded-lg border border-border bg-background p-2 shadow-lg">
            <Link href="/projects" className="workspace-nav-item">
              All workspaces
            </Link>
          </div>
        </details>
        <div className="mt-auto flex items-center gap-3 pt-4">
          <UserButton />
          <span className="text-xs text-muted-foreground">
            Personal workspace
          </span>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="workspace-topbar">
          <Link href="/projects" className="text-muted-foreground">
            Workspaces
          </Link>
          {title !== "Workspaces" ? (
            <>
              <ChevronRight
                size={13}
                className="text-muted-foreground"
                aria-hidden
              />
              <span className="truncate" title={title}>
                {title}
              </span>
            </>
          ) : null}
          <span
            role="status"
            className="ms-auto shrink-0 text-xs text-muted-foreground"
          >
            {!hydrated
              ? "Connecting…"
              : connection.isWebSocketConnected
                ? "Live updates"
                : "Reconnecting…"}
            {hydrated && !connection.isWebSocketConnected ? (
              <span className="sr-only">
                {" "}
                Check your connection and refresh if this continues. Saved work
                returns when you reconnect.
              </span>
            ) : null}
          </span>
        </header>
        <main
          id="project-content"
          className={`${workspacePageClass} workspace-main`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
