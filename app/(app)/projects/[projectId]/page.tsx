import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";
import {
  Project,
  ProjectFrame,
} from "@/components/projects/live-projects";
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await auth.protect();
  const { projectId } = await params;
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
      <Project projectId={projectId} />
    </Suspense>
  );
}
