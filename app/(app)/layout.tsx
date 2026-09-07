import { auth } from "@clerk/nextjs/server";
import { WorkspaceFeedbackProvider } from "@/components/projects/workspace-interactions";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await auth.protect();

  return <WorkspaceFeedbackProvider>{children}</WorkspaceFeedbackProvider>;
}
