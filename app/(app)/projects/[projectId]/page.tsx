import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";
import {
  Project,
  ProjectFrame,
} from "@/components/projects/live-projects";
export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ topic?: string }>;
}) {
  await auth.protect();
  const [{ projectId }, { topic }] = await Promise.all([params, searchParams]);
  return (
    <Suspense
      fallback={
        <ProjectFrame title="Project">
          <p role="status" className="text-sm text-muted-foreground">
            Loading project…
          </p>
        </ProjectFrame>
      }
    >
      <Project projectId={projectId} initialTopicId={topic} />
    </Suspense>
  );
}
