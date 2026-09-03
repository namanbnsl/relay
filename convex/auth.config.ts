import type { AuthConfig } from "convex/server";

const clerkJwtIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

if (clerkJwtIssuerDomain === undefined) {
  throw new Error("CLERK_JWT_ISSUER_DOMAIN is not configured");
}

export default {
  providers: [
    {
      domain: clerkJwtIssuerDomain,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
