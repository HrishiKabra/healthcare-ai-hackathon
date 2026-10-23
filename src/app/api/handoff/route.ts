import { parseBody, NO_STORE } from "@/lib/ai/route";
import { NarrativeRequest } from "@/lib/ai/schemas";
import { providerFor, runNarrative } from "@/lib/ai/server";

// The handoff itself is assembled deterministically in the browser from the
// chart (src/lib/handoff.ts). This route only writes the optional
// "AI summary, review before use" paragraph.
export async function POST(req: Request) {
  const body = await parseBody(req, NarrativeRequest);
  if (!body.ok) return body.res;
  const { provider } = providerFor(req.headers);
  return Response.json(await runNarrative(provider, body.data.handoffText), { headers: NO_STORE });
}
