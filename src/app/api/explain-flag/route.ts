import { parseBody, NO_STORE } from "@/lib/ai/route";
import { ExplainRequest } from "@/lib/ai/schemas";
import { providerFor, runExplain } from "@/lib/ai/server";

export async function POST(req: Request) {
  const body = await parseBody(req, ExplainRequest);
  if (!body.ok) return body.res;
  const { provider } = providerFor(req.headers);
  return Response.json(await runExplain(provider, body.data.flag), { headers: NO_STORE });
}
