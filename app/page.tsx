import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

const stages = [
  ["01", "Research", "Sources and claims stay connected."],
  ["02", "Content", "Scripts and scene plans remain versioned."],
  ["03", "Production", "Voice, assets, and renders stay traceable."],
  ["04", "Review", "Every decision names the exact artifact."],
  ["05", "Publish", "Only the approved result moves forward."],
] satisfies ReadonlyArray<
  readonly [number: string, name: string, detail: string]
>;

export default function Home() {
  return (
    <div className="mx-auto min-h-svh w-full max-w-[1120px] px-5 sm:px-8 lg:px-14">
      <header className="flex min-h-[72px] items-center justify-between">
        <a
          className="text-lg font-semibold tracking-[-0.062em] text-foreground"
          href="#top"
          aria-label="Relay home"
        >
          Relay
        </a>
        <div className="flex min-h-9 items-center justify-end">
          <Show when="signed-out">
            <SignInButton>
              <Button className="h-9" variant="default">
                Sign in
              </Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </header>

      <main id="main">
        <section
          className="grid grid-cols-1 gap-6 py-11 sm:grid-cols-12 sm:py-14 lg:py-[72px]"
          id="top"
          aria-labelledby="hero-title"
        >
          <div className="sm:col-span-9 lg:col-span-8">
            <h1
              className="max-w-[740px] text-[clamp(42px,6vw,68px)] font-semibold leading-[0.98] tracking-[-0.055em] text-balance"
              id="hero-title"
            >
              Evidence first.
              <br />
              Every handoff stays clear.
            </h1>
            <p id="principle" className="mt-[22px] max-w-[640px] text-[17px] leading-[1.55] tracking-[-0.012em] text-muted-foreground">
              Relay runs the complete workflow for evidence-backed videos,
              keeping research, exact versions, approvals, renders, and
              publishing decisions connected.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <Button className="h-10 sm:h-9" variant="signal" asChild>
                <a href="#workflow">
                  See the workflow{" "}
                  <ArrowRight strokeWidth={1.75} aria-hidden="true" />
                </a>
              </Button>
              <Button className="h-10 sm:h-9" variant="default" asChild>
                <a href="#principle">Why Relay</a>
              </Button>
            </div>
          </div>

          <dl id="workflow" className="m-0 self-end sm:col-span-3 sm:col-start-10">
            <div className="flex justify-between gap-4 border-y border-border py-2 text-xs">
              <dt className="text-muted-foreground">Workflow</dt>
              <dd className="m-0 font-semibold">Five stages</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border py-2 text-xs">
              <dt className="text-muted-foreground">Inference</dt>
              <dd className="m-0 font-semibold">User-owned</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border py-2 text-xs">
              <dt className="text-muted-foreground">Record</dt>
              <dd className="m-0 font-semibold">Durable</dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
