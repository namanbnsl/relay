import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const projects = [
  {
    id: "ai-industry-brief",
    name: "AI industry brief",
    description:
      "Monitor the AI ecosystem and prepare evidence-backed briefings.",
    dueResearch: 1,
  },
] satisfies ReadonlyArray<{
  id: string;
  name: string;
  description: string;
  dueResearch: number;
}>;

export default function ProjectsPage() {
  return (
    <div className="min-h-svh bg-background">
      <a
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
        href="#projects-content"
      >
        Skip to content
      </a>

      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-5 sm:px-8">
          <Link
            className="rounded-md text-[19px] font-semibold tracking-[-0.065em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
            href="/projects"
            aria-label="Relay projects"
          >
            Relay
          </Link>
          <Show when="signed-out">
            <SignInButton>
              <Button size="sm" variant="outline">
                Sign in
              </Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-[1120px] px-5 py-10 sm:px-8 sm:py-12"
        id="projects-content"
      >
        <div className="flex items-center justify-between gap-6">
          <h1 className="text-2xl font-semibold tracking-[-0.035em]">
            Projects
          </h1>
          <Button type="button">
            <Plus strokeWidth={2} aria-hidden="true" />
            New project
          </Button>
        </div>

        <section className="mt-6" aria-label="Projects">
          {projects.map((project) => (
            <Link
              className="group grid min-w-0 gap-3 rounded-lg px-3 py-3 transition-[background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              href={`/projects/${project.id}`}
              key={project.id}
            >
              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-[-0.02em]">
                  {project.name}
                </h2>
                <p className="mt-1 max-w-[620px] text-[13px] leading-5 text-muted-foreground">
                  {project.description}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground sm:justify-end">
                <span>{project.dueResearch} ready</span>
                <ArrowRight
                  className="transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)] group-hover:translate-x-0.5"
                  size={15}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
