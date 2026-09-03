import { verifyClerkToken } from "@clerk/mcp-tools/next";
import { auth } from "@clerk/nextjs/server";
import { createMcpHandler, withMcpAuth } from "mcp-handler";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "hello",
      {
        title: "Hello",
        description: "Returns a sample response for an authenticated Relay user.",
      },
      () => ({
        content: [
          {
            type: "text",
            text: "Hello from Relay. Your MCP request is authenticated.",
          },
        ],
      }),
    );
  },
  {
    serverInfo: {
      name: "relay",
      version: "0.1.0",
    },
  },
);

const authenticatedHandler = withMcpAuth(
  handler,
  async (_request, token) => {
    const clerkAuth = await auth({ acceptsToken: "oauth_token" });
    return verifyClerkToken(clerkAuth, token);
  },
  {
    required: true,
    requiredScopes: ["openid"],
    resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp",
  },
);

export { authenticatedHandler as POST };
