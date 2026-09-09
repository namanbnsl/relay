import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, ArrowUpRight, Check, Layers2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

const stages = [
  {
    title: "Ask a useful question",
    text: "Give a topic a home. Set the question your agent will investigate.",
  },
  {
    title: "Follow the evidence",
    text: "Read findings alongside source excerpts. See what’s supported and what needs work.",
  },
  {
    title: "Shape the script",
    text: "Turn approved research into narration and a scene-by-scene visual plan.",
  },
  {
    title: "Review with context",
    text: "Edit, request changes, or approve a specific version. Keep the earlier work close.",
  },
];

function StartButton({
  children = "Create your workspace",
}: {
  children?: React.ReactNode;
}) {
  return (
    <SignInButton forceRedirectUrl="/onboarding">
      <Button size="lg">
        {children}
        <ArrowRight aria-hidden />
      </Button>
    </SignInButton>
  );
}

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/projects");
  return (
    <div className="landing">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="landing-header landing-width">
        <Link href="/" aria-label="Relay home" className="workspace-brand">
          <span className="workspace-mark">
            <Layers2 size={17} aria-hidden />
          </span>
          Relay
        </Link>
        <nav
          aria-label="Main navigation"
          className="flex items-center gap-5 sm:gap-8"
        >
          <a
            href="#workflow"
            className="hidden text-sm text-muted-foreground sm:inline"
          >
            How it works
          </a>
          <SignInButton>
            <Button variant="outline" size="sm">
              Sign in
              <ArrowUpRight aria-hidden />
            </Button>
          </SignInButton>
        </nav>
      </header>
      <main id="main-content">
        <section
          className="landing-hero landing-width"
          aria-labelledby="hero-title"
        >
          <div>
            <p className="eyebrow">
              <span className="inline-block size-1.5 rounded-full bg-primary" />{" "}
              Your research. Your agent. One workspace.
            </p>
            <h1 id="hero-title">
              Good stories start
              <br className="hidden sm:block" /> with solid ground.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Bring your agent’s research into focus. Keep the evidence, shape
              the script, and know exactly what you’re approving.
            </p>
            <div className="mt-8">
              <StartButton />
            </div>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              Connect your own MCP-compatible agent when you’re ready.
            </p>
          </div>
          <figure className="product-preview" aria-labelledby="preview-caption">
            <div className="flex items-center justify-between border-b border-border px-5 py-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <Layers2 size={14} aria-hidden /> The weekly explainer
              </span>
              <span>01 / Research</span>
            </div>
            <div className="p-5 sm:p-7">
              <p className="eyebrow">Topic / A better internet</p>
              <h2 className="mt-3 text-xl font-semibold tracking-tight">
                Why do pages load faster the second time?
              </h2>
              <div className="mt-6 flex gap-5 border-b border-border text-xs">
                <span className="border-b-2 border-primary pb-3 font-semibold">
                  Research
                </span>
                <span className="text-muted-foreground">Script</span>
              </div>
              <p className="mt-5 text-sm leading-7">
                A browser can reuse a saved response instead of downloading the
                same resource again.
              </p>
              <div className="mt-5 border-s-2 border-primary/40 bg-surface-subtle p-4">
                <p className="eyebrow">Evidence to review</p>
                <p className="mt-2 text-sm leading-6">
                  Which resources can be reused, and for how long?
                </p>
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <ArrowUpRight size={13} aria-hidden /> Source excerpts stay
                  with each finding
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-xs font-medium text-primary">
                <Check size={14} aria-hidden /> Your review comes before the
                draft
              </div>
            </div>
            <figcaption
              id="preview-caption"
              className="border-t border-border px-5 py-3 text-xs text-muted-foreground"
            >
              Illustrative workflow · Your agent supplies the research.
            </figcaption>
          </figure>
        </section>
        <section
          id="workflow"
          className="landing-workflow landing-width"
          aria-labelledby="workflow-title"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">A clear path from question to script</p>
              <h2
                id="workflow-title"
                className="mt-3 text-2xl font-semibold tracking-tight"
              >
                Less handoff. More continuity.
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-muted-foreground">
              The question, the sources, the draft, and the decision belong
              together.
            </p>
          </div>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stages.map((stage, index) => (
              <li className="border-t border-border pt-5" key={stage.title}>
                <span className="font-mono text-xs text-primary">
                  0{index + 1}
                </span>
                <h3 className="mt-5 text-sm font-semibold">{stage.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {stage.text}
                </p>
              </li>
            ))}
          </ol>
        </section>
        <section
          className="landing-agent landing-width"
          aria-labelledby="agent-title"
        >
          <div>
            <p className="eyebrow">Works with your own agent</p>
            <h2
              id="agent-title"
              className="mt-3 max-w-sm text-3xl font-semibold leading-tight tracking-tight"
            >
              A shared desk.
              <br />
              You choose who thinks.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
              Connect through MCP, the protocol that lets an agent use Relay’s
              tools. Sign in to authorize access to your workspace.
            </p>
          </div>
          <dl className="divide-y divide-border">
            <div className="pb-6">
              <dt className="text-sm font-semibold">
                Relay keeps the work together
              </dt>
              <dd className="mt-2 text-sm leading-7 text-muted-foreground">
                Projects, findings, sources, script versions, and review
                decisions. When provider research is enabled, Relay runs it in
                the background and stores retrieved evidence.
              </dd>
            </div>
            <div className="pt-6">
              <dt className="text-sm font-semibold">
                Your agent brings the reasoning
              </dt>
              <dd className="mt-2 text-sm leading-7 text-muted-foreground">
                Your agent directs the work, synthesizes findings, and drafts
                with your own model. Inference access and costs depend on your
                provider. Relay does not independently verify agent-supplied
                sources.
              </dd>
            </div>
          </dl>
        </section>
        <section
          className="landing-closing landing-width"
          aria-labelledby="closing-title"
        >
          <div>
            <p className="eyebrow">Start with one question</p>
            <h2
              id="closing-title"
              className="mt-3 text-2xl font-semibold tracking-tight"
            >
              Give your next idea a place to take shape.
            </h2>
          </div>
          <StartButton>Get started</StartButton>
        </section>
      </main>
      <footer className="landing-width flex flex-wrap justify-between gap-3 border-t border-border py-6 text-xs text-muted-foreground">
        <span>Relay · Research, kept legible.</span>
        <span>Research → Evidence → Drafting → Review</span>
      </footer>
    </div>
  );
}
