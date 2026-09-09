import type { Metadata } from "next";
import { AgentOnboarding } from "@/components/projects/agent-onboarding";

export const metadata: Metadata = { title: "Connect your agent" };
export default function OnboardingPage() {
  return <AgentOnboarding />;
}
