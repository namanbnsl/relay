import { auth } from "@clerk/nextjs/server";

import { ConvexClientProvider } from "@/components/convex-client-provider";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await auth.protect();

  return (
    <ConvexClientProvider>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster />
    </ConvexClientProvider>
  );
}
