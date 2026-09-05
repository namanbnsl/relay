"use client";

import { Show, UserButton } from "@clerk/nextjs";
import { ArrowLeft, Compass, Files, Globe2, Plus } from "lucide-react";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export type WorkspacePage = "discover" | "topics" | "sources";
const pages = [
  { id: "discover", label: "Discover", icon: Compass },
  { id: "topics", label: "Topics", icon: Files },
  { id: "sources", label: "Sources", icon: Globe2 },
] satisfies { id: WorkspacePage; label: string; icon: typeof Compass }[];

type AppShellProps = {
  children: React.ReactNode;
  page: WorkspacePage;
  selectedTopicId: string | null;
  topics: { id: string; title: string }[];
  onNavigate: (page: WorkspacePage) => void;
  onSelectTopic: (id: string) => void;
  onAddTopic: () => void;
};

export function AppShell(props: AppShellProps) {
  return (
    <SidebarProvider className="research-workspace">
      <WorkspaceShell {...props} />
    </SidebarProvider>
  );
}

function WorkspaceShell({
  children,
  page,
  selectedTopicId,
  topics,
  onNavigate,
  onSelectTopic,
  onAddTopic,
}: AppShellProps) {
  const { setOpenMobile } = useSidebar();
  function navigate(action: () => void) {
    action();
    setOpenMobile(false);
  }
  return (
    <>
      <a
        href="#workspace-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        Skip to workspace
      </a>
      <Sidebar
        collapsible="offcanvas"
        className="research-workspace border-e border-sidebar-border"
      >
        <SidebarHeader className="flex h-14 justify-center px-5 py-0">
          <Link
            href="/projects"
            className="w-fit rounded-sm text-lg font-semibold tracking-[-0.055em] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Relay
          </Link>
        </SidebarHeader>
        <SidebarContent className="gap-0 px-3 pt-5">
          <nav aria-label="Workspace">
            <SidebarMenu className="gap-1">
              {pages.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    className="h-9 gap-2.5 rounded-md px-3 text-[13px] text-muted-foreground data-[active=true]:text-foreground"
                    isActive={page === item.id && selectedTopicId === null}
                    aria-current={
                      page === item.id && selectedTopicId === null
                        ? "page"
                        : undefined
                    }
                    onClick={() => navigate(() => onNavigate(item.id))}
                  >
                    <item.icon strokeWidth={1.5} aria-hidden="true" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </nav>
          <div className="mb-2 mt-8 flex items-center justify-between ps-3 pe-1">
            <p className="text-xs text-muted-foreground">Saved topics</p>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Add topic"
              onClick={() => navigate(onAddTopic)}
            >
              <Plus className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            </Button>
          </div>
          <nav aria-label="Saved topics">
            <SidebarMenu className="gap-1">
              {topics.map((topic) => (
                <SidebarMenuItem key={topic.id}>
                  <SidebarMenuButton
                    className="h-auto min-h-9 rounded-md px-3 py-2 text-[13px] leading-5 text-muted-foreground data-[active=true]:text-foreground [&>span:last-child]:overflow-visible [&>span:last-child]:whitespace-normal [&>span:last-child]:break-words"
                    isActive={selectedTopicId === topic.id}
                    aria-current={
                      selectedTopicId === topic.id ? "page" : undefined
                    }
                    onClick={() => navigate(() => onSelectTopic(topic.id))}
                  >
                    <span>{topic.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </nav>
        </SidebarContent>
        <SidebarFooter className="gap-4 px-6 py-5">
          <Link
            href="/projects"
            className="flex min-h-8 items-center gap-2 rounded-sm text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft
              className="size-3.5"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            All projects
          </Link>
          <Show when="signed-in">
            <UserButton showName />
          </Show>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger
              className="md:hidden"
              aria-label="Toggle workspace navigation"
            />
            <span className="text-[13px] font-medium">AI industry brief</span>
          </div>
          <details
            className="relative shrink-0"
            onKeyDown={(event) => {
              if (event.key === "Escape") event.currentTarget.open = false;
            }}
          >
            <summary className="flex min-h-8 cursor-pointer list-none items-center rounded-sm text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Sample workspace
            </summary>
            <div className="absolute end-0 top-10 z-30 w-60 rounded-lg border border-border bg-background p-4 text-xs leading-6 text-muted-foreground">
              Fictional research and review results. No live monitoring or model
              calls. Changes reset on reload.
            </div>
          </details>
        </header>
        <div id="workspace-content" className="min-w-0 flex-1">
          {children}
        </div>
      </SidebarInset>
    </>
  );
}
