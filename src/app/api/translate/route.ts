import { parseBody, NO_STORE } from "@/lib/ai/route";
import { TranslateRequest } from "@/lib/ai/schemas";
import { providerFor, runTranslate } from "@/lib/ai/server";

export async function POST(req: Request) {
  const body = await parseBody(req, TranslateRequest);
  if (!body.ok) return body.res;
  const { provider } = providerFor(req.headers);
  return Response.json(await runTranslate(provider, body.data), { headers: NO_STORE });
}
