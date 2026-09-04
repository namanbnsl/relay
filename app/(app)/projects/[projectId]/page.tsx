import { notFound } from "next/navigation";

import { ResearchWorkspace } from "@/components/projects/research-workspace";

const projectIds = new Set(["ai-industry-brief"]);

export default async function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  if (!projectIds.has(projectId)) {
    notFound();
  }

  return <ResearchWorkspace />;
}
