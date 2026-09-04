// import { auth } from "@clerk/nextjs/server";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Temporarily disabled while the authenticated UI is reviewed in-browser.
  // await auth.protect();

  return children;
}
