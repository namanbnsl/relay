import { z } from "zod";
const remoteId = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9_.:-]+$/);
export const webUrl = z
  .url()
  .max(2048)
  .refine((s) => {
    const u = new URL(s);
    return (
      ["http:", "https:"].includes(u.protocol) && !u.username && !u.password
    );
  });
const citation = z.object({
  url: webUrl,
  title: z.string().max(1000).nullish(),
});
export const exaRun = z.object({
  id: remoteId,
  status: z.enum(["queued", "running", "completed", "failed", "cancelled"]),
  stopReason: z.string().max(200).nullish(),
  request: z
    .object({
      metadata: z.object({ relayRunId: z.string().optional() }).nullish(),
    })
    .nullish(),
  output: z
    .object({
      text: z.string().max(200000).nullish(),
      structured: z.json().optional(),
      grounding: z
        .array(
          z.object({
            field: z.string().max(2000),
            citations: z.array(citation).max(100),
            confidence: z.string().max(100).nullish(),
          }),
        )
        .max(200)
        .nullish(),
    })
    .nullish(),
  usage: z
    .object({
      agentComputeUnits: z.number().nonnegative().optional(),
      searches: z.number().nonnegative().optional(),
      emails: z.number().nonnegative().optional(),
      phoneNumbers: z.number().nonnegative().optional(),
    })
    .nullish(),
  costDollars: z.object({ total: z.number().nonnegative() }).nullish(),
});
export const contentsResponse = z.object({
  results: z
    .array(
      z.object({
        url: webUrl,
        title: z.string().max(1000).nullish(),
        text: z.string().max(30000).nullish(),
        publishedDate: z.string().max(100).nullish(),
        author: z.string().max(500).nullish(),
      }),
    )
    .max(20),
  costDollars: z.object({ total: z.number().nonnegative() }).optional(),
});
export class ProviderError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryable = false,
  ) {
    super(code);
  }
}
async function request(path: string, body?: object): Promise<unknown> {
  const key = process.env.EXA_API_KEY;
  if (!key) throw new ProviderError("provider_not_configured");
  let response: Response;
  try {
    response = await fetch(`https://api.exa.ai${path}`, {
      method: body ? "POST" : "GET",
      headers: { "x-api-key": key, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(25000),
      redirect: "error",
    });
  } catch {
    throw new ProviderError("provider_network_or_timeout", true);
  }
  if (!response.ok)
    throw new ProviderError(
      `provider_http_${response.status}`,
      response.status === 429 || response.status >= 500,
    );
  // Bound streaming response allocation, not just the parsed object.
  const reader = response.body?.getReader();
  if (!reader) throw new ProviderError("provider_empty_response");
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  while (true) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await reader.read();
    } catch {
      throw new ProviderError("provider_network_or_timeout", true);
    }
    if (chunk.done) break;
    bytes += chunk.value.byteLength;
    if (bytes > 1500000) {
      await reader.cancel();
      throw new ProviderError("provider_response_too_large");
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
  try {
    return JSON.parse(text + decoder.decode());
  } catch {
    throw new ProviderError("provider_invalid_json");
  }
}
function parseRun(value: unknown) {
  const result = exaRun.safeParse(value);
  if (!result.success) throw new ProviderError("provider_invalid_run");
  return result.data;
}
export async function startExa(args: {
  brief: string;
  effort: "minimal" | "low" | "medium";
  runId: string;
}) {
  // No documented idempotency header: never retry this POST automatically.
  const raw = await request("/agent/runs", {
    query: args.brief,
    systemPrompt: `Research public web sources only. Today is ${new Date().toISOString().slice(0, 10)}. Respect an explicitly requested historical period; otherwise check current sources for latest/current questions. Read primary sources before making factual assertions, cite the specific supporting pages, and distinguish source statements from inference. Seek independent corroboration for exceptional scientific claims; omit unsupported claims rather than inventing announcements or URLs. Return a focused answer to the research question with citations and concrete coverage gaps, not a generic company overview. Never use contact enrichment, premium data sources or purchase contact data.`,
    effort: args.effort,
    metadata: { relayRunId: args.runId },
  });
  // Persist an accepted ID even if optional output fields later prove malformed.
  const accepted = z.object({ id: remoteId }).safeParse(raw);
  if (!accepted.success) throw new ProviderError("provider_invalid_submission");
  return accepted.data.id;
}
export async function getExa(id: string) {
  return parseRun(await request(`/agent/runs/${encodeURIComponent(id)}`));
}
export async function cancelExa(id: string) {
  return parseRun(
    await request(`/agent/runs/${encodeURIComponent(id)}/cancel`, {}),
  );
}
export async function reconcileExa(runId: string) {
  const list = z
    .object({
      data: z
        .array(
          z.object({
            id: remoteId,
            request: z
              .object({
                metadata: z
                  .object({ relayRunId: z.string().optional() })
                  .nullish(),
              })
              .nullish(),
          }),
        )
        .max(100),
    })
    .safeParse(await request("/agent/runs?limit=100"));
  if (!list.success) throw new ProviderError("provider_invalid_history");
  const matches = list.data.data.filter(
    (r) => r.request?.metadata?.relayRunId === runId,
  );
  return matches.length === 1 ? matches[0].id : null;
}
export async function getContents(url: string) {
  const parsed = contentsResponse.safeParse(
    await request("/contents", { urls: [url], text: { maxCharacters: 30000 } }),
  );
  if (!parsed.success) throw new ProviderError("provider_invalid_contents");
  return parsed.data;
}
export function sourceList(run: z.infer<typeof exaRun>) {
  const sources = new Map<string, z.infer<typeof citation>>();
  for (const entry of (run.output?.grounding ?? []).flatMap((g) => g.citations))
    sources.set(entry.url, entry);
  // Providers may cite pages in the report but omit them from structured grounding.
  // These are retrieval candidates only, never evidence until Contents succeeds.
  for (const match of (run.output?.text ?? "").matchAll(
    /\[([^\]\n]{1,1000})\]\((https?:\/\/[^\s<>]+?)\)/g,
  )) {
    const parsed = citation.safeParse({ title: match[1], url: match[2] });
    if (parsed.success && !sources.has(parsed.data.url))
      sources.set(parsed.data.url, parsed.data);
  }
  return [...sources.values()];
}
export function providerError(error: unknown) {
  return error instanceof ProviderError
    ? error.code
    : "provider_processing_failed";
}

export async function searchExa(options: {
  query: string;
  numResults: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
}) {
  const parsed = z
    .object({
      results: z
        .array(
          z.object({
            url: webUrl,
            title: z.string().max(1000).nullish(),
            highlights: z.array(z.string().max(8000)).max(20).nullish(),
          }),
        )
        .max(10),
      costDollars: z.object({ total: z.number().nonnegative() }).optional(),
    })
    .safeParse(
      await request("/search", {
        ...options,
        type: "auto",
        contents: { highlights: { maxCharacters: 2000 } },
      }),
    );
  if (!parsed.success) throw new ProviderError("provider_invalid_search");
  return parsed.data;
}
