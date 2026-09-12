import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
const http = httpRouter();
http.route({
  path: "/exa-monitor",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    if (body.length > 1000000)
      return new Response("Payload too large", { status: 413 });
    try {
      const status = await ctx.runAction(internal.monitorActions.webhook, {
        body,
        signature: request.headers.get("Exa-Signature") ?? "",
      });
      return new Response(status === 200 ? "Received" : "Delivery rejected", {
        status,
      });
    } catch {
      return new Response("Invalid delivery", { status: 400 });
    }
  }),
});
export default http;
