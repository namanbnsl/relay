import { DesignSystemNav } from "@/components/design-system-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const colors = [
  { name: "Ink", value: "#20221D", className: "bg-foreground" },
  { name: "Canvas", value: "#F1F2E9", className: "bg-background" },
  { name: "Surface", value: "#FCFCF7", className: "bg-card" },
  { name: "Secondary", value: "#62665B", className: "bg-muted-foreground" },
  { name: "Border", value: "#CED1C4", className: "bg-border" },
  { name: "Signal", value: "#DDF45B", className: "bg-signal" },
  { name: "Danger", value: "#A64035", className: "bg-destructive" },
  { name: "Success", value: "#256248", className: "bg-[#256248]" },
] satisfies ReadonlyArray<{ name: string; value: string; className: string }>;

const spacing = [
  { token: "1", value: "4px", width: "w-1" },
  { token: "2", value: "8px", width: "w-2" },
  { token: "3", value: "12px", width: "w-3" },
  { token: "4", value: "16px", width: "w-4" },
  { token: "6", value: "24px", width: "w-6" },
  { token: "8", value: "32px", width: "w-8" },
  { token: "12", value: "48px", width: "w-12" },
  { token: "16", value: "64px", width: "w-16" },
] satisfies ReadonlyArray<{ token: string; value: string; width: string }>;

const principles = [
  { title: "Evidence before confidence", body: "Show the claim, source, and caveat before any score or recommendation." },
  { title: "Approval names a version", body: "Every decision points to an exact artifact. Revisions require a new approval." },
  { title: "Signal has a job", body: "Reserve citron for selection, workflow focus, and one preferred action." },
  { title: "Stillness supports review", body: "Use motion to explain a state change, never to animate evidence under inspection." },
] satisfies ReadonlyArray<{ title: string; body: string }>;

function SectionIntro({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <div className="col-span-full min-[661px]:col-span-4 min-[901px]:col-span-3">
      <h2 id={id} className="font-display text-2xl font-semibold leading-[1.2] tracking-[-0.03em]">{title}</h2>
      <p className="mt-2 max-w-48 text-[13px] leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

const sectionClassName = "grid scroll-mt-6 grid-cols-12 gap-6 border-t py-12 min-[661px]:py-16";
const sectionBodyClassName = "col-span-full min-w-0 min-[661px]:col-span-8 min-[661px]:col-start-5";

export default function Home() {
  return (
    <div className="grid min-h-screen grid-cols-1 min-[901px]:grid-cols-[240px_minmax(0,1fr)]">
      <a href="#main" className="fixed left-3 top-3 z-50 -translate-y-[180%] rounded-md bg-foreground px-3 py-2 text-primary-foreground focus:translate-y-0">Skip to content</a>

      <aside className="border-b px-6 py-5 min-[661px]:grid min-[661px]:grid-cols-[1fr_auto] min-[661px]:items-center min-[901px]:sticky min-[901px]:top-0 min-[901px]:flex min-[901px]:h-screen min-[901px]:flex-col min-[901px]:items-stretch min-[901px]:border-b-0 min-[901px]:border-r min-[901px]:px-6 min-[901px]:py-7">
        <div>
          <a href="#top" className="font-display text-lg font-semibold tracking-[-0.062em]" aria-label="Relay design system home">Relay</a>
          <p className="mt-4 hidden text-xs leading-[1.4] text-muted-foreground min-[901px]:block">Clear handoffs<br />Design system, alpha</p>
        </div>
        <DesignSystemNav />
        <p className="mt-auto hidden font-mono text-xs leading-[1.4] text-muted-foreground min-[901px]:block">Light mode<br />4px base unit</p>
      </aside>

      <main id="main" className="w-full min-w-0 max-w-[1120px] px-5 pb-20 pt-11 min-[661px]:px-8 min-[661px]:pb-24 min-[661px]:pt-14 min-[901px]:px-14 min-[901px]:pb-28 min-[901px]:pt-[72px]">
        <header id="top" className="grid grid-cols-12 gap-6 pb-12 min-[661px]:pb-[72px]">
          <div className="col-span-full min-[661px]:col-span-9 min-[901px]:col-span-8">
            <h1 className="max-w-[740px] font-display text-[clamp(42px,6vw,68px)] font-semibold leading-[0.98] tracking-[-0.055em]"><span className="relay-highlight">Evidence</span> first.<br />Every handoff stays clear.</h1>
            <p className="mt-[22px] max-w-[640px] text-[17px] leading-[1.55] tracking-[-0.012em] text-muted-foreground">Relay is a production workspace for faceless video. It keeps sourced research, exact versions, approvals, renders, and publishing decisions connected.</p>
          </div>
          <div className="col-span-full mt-[18px] self-end min-[661px]:col-span-3 min-[661px]:col-start-10 min-[661px]:mt-0 min-[661px]:pb-[7px]" aria-label="System details">
            <p className="flex justify-between gap-4 border-y py-2 text-xs text-muted-foreground"><span>Mode</span><strong className="font-semibold text-foreground">Light</strong></p>
            <p className="flex justify-between gap-4 border-b py-2 text-xs text-muted-foreground"><span>Workflow</span><strong className="font-semibold text-foreground">5 stages</strong></p>
            <p className="flex justify-between gap-4 border-b py-2 text-xs text-muted-foreground"><span>Status</span><strong className="font-semibold text-foreground">Alpha</strong></p>
          </div>
        </header>

        <section id="color" aria-labelledby="color-title" className={sectionClassName}>
          <SectionIntro id="color-title" title="Color" description="Mineral paper, carbon ink, and one signal highlighter." />
          <div className={sectionBodyClassName}>
            <div className="grid grid-cols-1 gap-x-3.5 gap-y-6 min-[440px]:grid-cols-2 min-[760px]:grid-cols-4">
              {colors.map((color) => (
                <div key={color.value} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2">
                  <span className={`col-span-full h-[84px] rounded-[12px_12px_4px_4px] border border-foreground/10 ${color.className}`} />
                  <p className="font-semibold">{color.name}</p>
                  <code className="font-mono text-[11px] text-muted-foreground">{color.value}</code>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="type" aria-labelledby="type-title" className={sectionClassName}>
          <SectionIntro id="type-title" title="Typography" description="Instrument Sans, with IBM Plex Mono for operational detail." />
          <div className={sectionBodyClassName}>
            <div className="border-t">
              <div className="grid grid-cols-[76px_minmax(0,1fr)] items-baseline gap-5 border-b py-6 min-[661px]:grid-cols-[110px_minmax(0,1fr)_120px]"><code className="font-mono text-[11px] text-muted-foreground">Display</code><p className="font-display text-[44px] font-semibold leading-none tracking-[-0.05em]">Version approved.</p><code className="hidden font-mono text-[11px] text-muted-foreground min-[661px]:block">44 / 44</code></div>
              <div className="grid grid-cols-[76px_minmax(0,1fr)] items-baseline gap-5 border-b py-6 min-[661px]:grid-cols-[110px_minmax(0,1fr)_120px]"><code className="font-mono text-[11px] text-muted-foreground">Heading</code><p className="font-display text-2xl font-semibold leading-[1.2] tracking-[-0.035em]">Choose what advances next</p><code className="hidden font-mono text-[11px] text-muted-foreground min-[661px]:block">24 / 29</code></div>
              <div className="grid grid-cols-[76px_minmax(0,1fr)] items-baseline gap-5 border-b py-6 min-[661px]:grid-cols-[110px_minmax(0,1fr)_120px]"><code className="font-mono text-[11px] text-muted-foreground">Body</code><p>Relay linked this scene to two approved claims and three sources.</p><code className="hidden font-mono text-[11px] text-muted-foreground min-[661px]:block">14 / 21</code></div>
              <div className="grid grid-cols-[76px_minmax(0,1fr)] items-baseline gap-5 border-b py-6 min-[661px]:grid-cols-[110px_minmax(0,1fr)_120px]"><code className="font-mono text-[11px] text-muted-foreground">Mono</code><p className="font-mono text-xs">script-v03 · sha256:7d49c8a1</p><code className="hidden font-mono text-[11px] text-muted-foreground min-[661px]:block">12 / 17</code></div>
            </div>
          </div>
        </section>

        <section id="spacing" aria-labelledby="spacing-title" className={sectionClassName}>
          <SectionIntro id="spacing-title" title="Spacing" description="A 4px base unit. Most relationships use 8px to 32px." />
          <div className={sectionBodyClassName}>
            <div className="grid gap-3.5" aria-label="Spacing scale">
              {spacing.map((space) => (
                <div key={space.token} className="grid grid-cols-[48px_minmax(0,1fr)_50px] items-center gap-4"><code className="font-mono text-[11px] text-muted-foreground">{space.token}</code><span className={`h-2 rounded-sm bg-foreground ${space.width}`} /><code className="font-mono text-[11px] text-muted-foreground">{space.value}</code></div>
              ))}
            </div>
          </div>
        </section>

        <section id="components" aria-labelledby="components-title" className={sectionClassName}>
          <SectionIntro id="components-title" title="Components" description="Compact controls with visible states and exact labels." />
          <div className={sectionBodyClassName}>
            <div>
              <p className="mb-2.5 text-xs font-semibold text-muted-foreground">Buttons</p>
              <div className="flex flex-wrap items-center gap-2.5 rounded-[14px_14px_5px_14px] border bg-card p-5 min-[661px]:p-7"><Button>Save draft</Button><Button variant="signal">Approve research</Button><Button variant="outline">Request changes</Button><Button variant="ghost">Cancel</Button><Button disabled>Rendering</Button></div>
            </div>
            <div className="mt-10">
              <p className="mb-2.5 text-xs font-semibold text-muted-foreground">Fields</p>
              <div className="grid gap-5 rounded-[14px_14px_5px_14px] border bg-card p-5 min-[661px]:grid-cols-2 min-[661px]:p-7">
                <div><label htmlFor="project" className="mb-1.5 block text-xs font-semibold">Project</label><Input id="project" defaultValue="Grid systems explained" className="h-10 border-input bg-card" /><p className="mt-1.5 text-xs text-muted-foreground">Artifacts remain versioned together.</p></div>
                <div><label htmlFor="revision" className="mb-1.5 block text-xs font-semibold">Revision request</label><Input id="revision" placeholder="Describe the exact change" className="h-10 border-input bg-card" /><p className="mt-1.5 text-xs text-muted-foreground">Attached to content version 3.</p></div>
              </div>
            </div>
            <div className="mt-10">
              <p className="mb-2.5 text-xs font-semibold text-muted-foreground">State and identifiers</p>
              <div className="flex flex-wrap items-center gap-3 rounded-[14px_14px_5px_14px] border bg-card p-5 min-[661px]:p-7"><span className="inline-flex items-center gap-1.5 font-semibold text-[#256248]"><span className="size-1.5 rounded-full bg-current" />Approved</span><code className="rounded border bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">content-v03</code><code className="font-mono text-xs text-muted-foreground">sha256:7d49c8a1</code></div>
            </div>
          </div>
        </section>

        <section id="product" aria-labelledby="product-title" className={sectionClassName}>
          <SectionIntro id="product-title" title="Product pattern" description="The artifact and its approval decision share one frame." />
          <div className={sectionBodyClassName}>
            <div className="overflow-hidden rounded-[14px] border bg-card">
              <div className="flex h-[42px] items-center justify-between border-b px-4"><p className="font-semibold">Review research</p><span className="font-mono text-[11px] text-muted-foreground">research-v02</span></div>
              <div className="grid min-h-[360px] min-[760px]:grid-cols-[1fr_280px]">
                <div className="grid min-w-0 place-items-center bg-secondary p-4 min-[661px]:p-9">
                  <article className="relative w-full max-w-[440px] rounded-[10px] border-2 border-foreground bg-card p-6 shadow-[0_8px_24px_rgba(32,34,29,0.08)]">
                    <span className="absolute -left-[5px] -top-[5px] size-[10px] rounded-full border-2 border-foreground bg-signal" />
                    <p className="font-mono text-[11px] text-muted-foreground">CLM-07 · 2 sources · medium confidence</p>
                    <h3 className="mt-8 text-base font-semibold tracking-[-0.018em]">The observed change is correlated, not proven causal.</h3>
                    <p className="mt-3 text-[13px] leading-5 text-muted-foreground">Keep this qualifier in the narration and on-screen comparison.</p>
                    <div className="mt-6 border-t pt-3 text-xs text-muted-foreground">Used by scenes 04 and 05</div>
                    <span className="absolute -bottom-[5px] -right-[5px] size-[10px] rounded-full border-2 border-foreground bg-signal" />
                  </article>
                </div>
                <aside className="flex min-w-0 flex-col border-t p-6 min-[760px]:border-l min-[760px]:border-t-0">
                  <h3 className="text-base font-semibold tracking-[-0.018em]">Approve research</h3>
                  <p className="mt-1.5 text-xs text-muted-foreground">Approval locks this exact version and its claim links.</p>
                  <dl className="mt-5">
                    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 border-t py-3 text-xs"><dt className="text-muted-foreground">Claims</dt><dd>12 supported</dd></div>
                    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 border-t py-3 text-xs"><dt className="text-muted-foreground">Sources</dt><dd>18 reachable</dd></div>
                    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 border-t py-3 text-xs"><dt className="text-muted-foreground">Caveats</dt><dd>3 retained</dd></div>
                    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 border-y py-3 text-xs"><dt className="text-muted-foreground">Hash</dt><dd className="truncate font-mono">7d49c8a1</dd></div>
                  </dl>
                  <div className="mt-auto flex gap-2 pt-6"><Button variant="outline">Review all</Button><Button variant="signal" className="flex-1">Approve v2</Button></div>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section id="principles" aria-labelledby="principles-title" className={sectionClassName}>
          <SectionIntro id="principles-title" title="Principles" description="The rules that matter when the component library runs out." />
          <div className={`${sectionBodyClassName} grid gap-x-12 gap-y-8 min-[661px]:grid-cols-2`}>
            {principles.map((principle) => (
              <article key={principle.title} className="border-t border-input pt-3.5"><h3 className="font-semibold">{principle.title}</h3><p className="mt-2 text-[13px] leading-5 text-muted-foreground">{principle.body}</p></article>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t pt-6 text-xs text-muted-foreground min-[661px]:flex-row min-[661px]:justify-between"><span>Relay design system</span><span>Light mode · Evidence attached · Approval explicit</span></footer>
      </main>
    </div>
  );
}
