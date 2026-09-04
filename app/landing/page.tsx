import { Show, SignInButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const stages = ["Monitor", "Research", "Approve", "Publish"] as const;

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <a
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
        href="#main-content"
      >
        Skip to content
      </a>

      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-5 sm:px-8">
          <span className="text-[19px] font-semibold tracking-[-0.065em]">
            Relay
          </span>
          <Show when="signed-out">
            <SignInButton>
              <Button size="sm" variant="outline">
                Sign in
              </Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Button size="sm" asChild>
              <Link href="/projects">Open workspace</Link>
            </Button>
          </Show>
        </div>
      </header>

      <main
        className="mx-auto flex w-full max-w-[1120px] flex-1 items-center px-5 py-20 sm:px-8 sm:py-28"
        id="main-content"
      >
        <section className="w-full max-w-[760px]" aria-labelledby="hero-title">
          <h1
            className="text-[clamp(2.75rem,7vw,5rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-balance"
            id="hero-title"
          >
            Evidence first. Every handoff stays clear.
          </h1>
          <p className="mt-6 max-w-[610px] text-base leading-7 text-muted-foreground text-pretty sm:text-lg sm:leading-8">
            Relay keeps research, approvals, and production connected to the
            exact sources your team trusts.
          </p>

          <div className="mt-8">
            <Show when="signed-out">
              <SignInButton>
                <Button size="lg">
                  Start with Relay
                  <ArrowRight strokeWidth={1.8} aria-hidden="true" />
                </Button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <Button size="lg" asChild>
                <Link href="/projects">
                  Open your projects
                  <ArrowRight strokeWidth={1.8} aria-hidden="true" />
                </Link>
              </Button>
            </Show>
          </div>

          <ol className="mt-16 grid max-w-[640px] grid-cols-2 border-t border-border text-[13px] font-medium sm:grid-cols-4">
            {stages.map((stage, index) => (
              <li
                className="flex items-center gap-2 border-b border-border py-3 sm:border-b-0 sm:pe-4"
                key={stage}
              >
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {stage}
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center px-5 text-xs text-muted-foreground sm:px-8">
          Research operations, kept legible.
        </div>
      </footer>
    </div>
  );
}
