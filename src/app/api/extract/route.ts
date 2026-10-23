import { parseBody, NO_STORE } from "@/lib/ai/route";
import { ExtractRequest } from "@/lib/ai/schemas";
import { providerFor, runExtract } from "@/lib/ai/server";

export async function POST(req: Request) {
  const body = await parseBody(req, ExtractRequest);
  if (!body.ok) return body.res;
  const { provider } = providerFor(req.headers);
  return Response.json(await runExtract(provider, body.data), { headers: NO_STORE });
}
