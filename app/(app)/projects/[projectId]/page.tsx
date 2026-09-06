import { auth } from "@clerk/nextjs/server";
import { Project } from "@/components/projects/live-projects";
export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ topic?: string }>;
}) {
  await auth.protect();
  const [{ projectId }, { topic }] = await Promise.all([params, searchParams]);
  return <Project projectId={projectId} initialTopicId={topic} />;
}
