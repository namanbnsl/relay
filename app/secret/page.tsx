import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

import { SecretData } from "@/app/secret/secret-data";
import { Button } from "@/components/ui/button";

export default async function SecretPage() {
  const { isAuthenticated, redirectToSignIn } = await auth();

  if (!isAuthenticated) {
    return redirectToSignIn();
  }

  return (
    <div className="mx-auto min-h-svh w-full max-w-[920px] px-5 sm:px-8 lg:px-14">
      <header className="flex min-h-[72px] items-center justify-between border-b border-border">
        <Link
          className="text-lg font-semibold tracking-[-0.062em] text-foreground"
          href="/"
          aria-label="Relay home"
        >
          Relay
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/">Back home</Link>
          </Button>
          <UserButton />
        </div>
      </header>

      <main className="py-12 sm:py-16">
        <div className="max-w-[640px]">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Authenticated area
          </p>
          <h1 className="mt-3 text-[clamp(34px,5vw,52px)] font-semibold leading-none tracking-[-0.045em] text-balance">
            The secret page
          </h1>
          <p className="mt-4 max-w-[560px] text-[16px] leading-7 text-muted-foreground">
            These starter records come from Convex. Both this route and the
            backend query require a valid Clerk session.
          </p>
        </div>

        <SecretData />
      </main>
    </div>
  );
}
