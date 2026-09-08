import { auth } from "@clerk/nextjs/server";
import { Projects } from "@/components/projects/live-projects";
export default async function ProjectsPage() {
  await auth.protect();
  return <Projects />;
}
