/* eslint-disable @next/next/no-html-link-for-pages -- Isolated Vite fixture, not a Next.js route. */
import { createRoot } from "react-dom/client";
import {
  Discover,
  TopicBrief,
  InvestigationStatus,
  WorkspaceNavigation,
} from "../../components/projects/discovery-workspace";
import { topic } from "./convex-fixture";
import "../../app/globals.css";
const view = new URLSearchParams(location.search).get("view");
createRoot(document.getElementById("root")).render(
  <div className="research-workspace workspace-shell min-h-svh bg-background text-foreground">
    <aside className="workspace-sidebar">
      <a className="workspace-brand" href="/">
        Relay
      </a>
      <p className="text-xs text-muted-foreground">
        Browser fixture · no live backend
      </p>
      <nav className="mt-8">
        <a className="workspace-nav-item" href="/">
          AI Explained
        </a>
        <a className="workspace-nav-item" href="/?view=brief">
          Topic brief
        </a>
        <a className="workspace-nav-item" href="/?state=empty">
          Empty updates
        </a>
        <a className="workspace-nav-item" href="/?state=loading">
          Loading
        </a>
        <a className="workspace-nav-item" href="/?state=error">
          Save failure
        </a>
      </nav>
    </aside>
    <div className="min-w-0">
      <header className="workspace-topbar">
        Workspaces / AI Explained{" "}
        <span className="ms-auto text-xs">Fixture</span>
      </header>
      <main className="workspace-main mx-auto w-full max-w-[1040px] px-5 py-8 sm:px-10 sm:py-10 lg:px-12">
        <WorkspaceNavigation
          projectId={topic.projectId}
          discover={view !== "brief"}
        />
        {view === "brief" ? (
          <>
            <h1 className="mb-8 text-2xl">{topic.title}</h1>
            <TopicBrief topic={topic} />
            <InvestigationStatus
              projectId={topic.projectId}
              topicId={topic._id}
            />
          </>
        ) : (
          <Discover projectId={topic.projectId} topics={[topic]} />
        )}
      </main>
    </div>
  </div>,
);
