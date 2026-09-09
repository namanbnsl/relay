"use client";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { Button } from "@/components/ui/button";
export default function ProjectsError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center px-5 py-16">
      <h1 className="text-2xl font-semibold">Project unavailable</h1>
      <p className="my-4 text-sm leading-7 text-muted-foreground">
        The project may not exist, you may not have access, or the connection
        was interrupted.
      </p>
      <div className="flex items-center gap-4">
        <Button onClick={reset}>Try again</Button>
        <Link
          className={buttonVariants({ variant: "outline" })}
          href="/projects"
        >
          All projects
        </Link>
      </div>
    </main>
  );
}
