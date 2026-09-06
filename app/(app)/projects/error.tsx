"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ProjectsError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-5 py-12">
      <h1 className="text-2xl font-semibold">Project unavailable</h1>
      <p className="my-4 text-sm">
        The project may not exist, you may not have access, or the connection
        was interrupted.
      </p>
      <div className="flex items-center gap-4">
        <Button onClick={reset}>Try again</Button>
        <Link href="/projects">All projects</Link>
      </div>
    </main>
  );
}
