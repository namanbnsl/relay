"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
export default function OnboardingError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center px-5 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        We couldn’t load your connection activity
      </h1>
      <p className="my-4 text-sm leading-7 text-muted-foreground">
        Check your connection and try again. If this workspace was recently
        updated, its agent-activity service may still need to be enabled. Your
        existing projects are unchanged.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link
          href="/projects"
          className={buttonVariants({ variant: "outline" })}
        >
          Go to projects
        </Link>
      </div>
    </main>
  );
}
