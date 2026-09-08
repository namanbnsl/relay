import { auth } from "@clerk/nextjs/server";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await auth.protect();

  return children;
}
