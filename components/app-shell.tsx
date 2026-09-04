"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { ArrowLeft, Hash, LogIn, Plus } from "lucide-react";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type SidebarTopic = {
  id: string;
  title: string;
  newSignalCount: number;
};

type AppNavigation = {
  projectName: string;
  selectedTopicId: string;
  topics: ReadonlyArray<SidebarTopic>;
  onSelectTopic: (topicId: string) => void;
};

export function AppShell({
  children,
  navigation,
}: Readonly<{
  children: React.ReactNode;
  navigation: AppNavigation;
}>) {
  return (
    <SidebarProvider>
      <a
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
        href="#workspace-content"
      >
        Skip to workspace
      </a>

      <Sidebar
        className="border-e border-sidebar-border"
        collapsible="offcanvas"
      >
        <SidebarHeader className="px-3 pb-2 pt-3">
          <Link
            className="flex h-8 w-fit items-center rounded-md px-2 text-sm font-semibold tracking-[-0.035em] transition-[background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
            href="/projects"
            aria-label="Relay projects"
          >
            Relay
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-2 pb-2">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-8 rounded-md px-2 text-[13px] font-medium text-muted-foreground transition-[background-color,color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-secondary hover:text-foreground"
                    asChild
                  >
                    <Link href="/projects">
                      <ArrowLeft strokeWidth={1.75} aria-hidden="true" />
                      <span>All projects</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-4 p-0">
            <SidebarGroupLabel className="h-8 px-2 text-xs font-semibold text-sidebar-foreground">
              <span className="truncate">{navigation.projectName}</span>
            </SidebarGroupLabel>
            <SidebarGroupAction
              className="end-0.5 top-0.5 size-7 rounded-md text-muted-foreground transition-[background-color,color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-secondary hover:text-foreground"
              aria-label="Add topic"
              title="Add topic"
              type="button"
            >
              <Plus strokeWidth={2} />
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {navigation.topics.map((topic) => (
                  <SidebarMenuItem key={topic.id}>
                    <SidebarMenuButton
                      className="h-8 rounded-md px-2 text-[13px] font-medium text-muted-foreground transition-[background-color,color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-secondary hover:text-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground"
                      aria-pressed={topic.id === navigation.selectedTopicId}
                      isActive={topic.id === navigation.selectedTopicId}
                      onClick={() => navigation.onSelectTopic(topic.id)}
                      type="button"
                    >
                      <Hash strokeWidth={1.75} aria-hidden="true" />
                      <span className="truncate">{topic.title}</span>
                      {topic.newSignalCount > 0 ? (
                        <span className="ms-auto text-[11px] font-medium tabular-nums text-muted-foreground">
                          {topic.newSignalCount}
                          <span className="sr-only"> new signals</span>
                        </span>
                      ) : null}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="px-2 py-3">
          <Show when="signed-out">
            <SidebarMenu>
              <SidebarMenuItem>
                <SignInButton>
                  <SidebarMenuButton className="h-8 rounded-md px-2 text-[13px] font-medium">
                    <LogIn strokeWidth={1.75} aria-hidden="true" />
                    <span>Sign in</span>
                  </SidebarMenuButton>
                </SignInButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </Show>
          <Show when="signed-in">
            <UserButton showName />
          </Show>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-svh min-w-0" id="workspace-content">
        <header className="flex h-12 items-center gap-3 border-b border-border px-3 md:hidden">
          <SidebarTrigger
            className="-ms-1 size-10"
            aria-label="Open project navigation"
          />
          <span className="font-semibold tracking-[-0.04em]">Relay</span>
          <span className="ms-auto max-w-[55vw] truncate text-xs text-muted-foreground">
            {navigation.projectName}
          </span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
