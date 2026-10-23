import { connection } from "next/server";
import { readAiConfig, selectProvider } from "@/lib/ai/config";
import { ollamaStatus } from "@/lib/ai/ollama";
import { NO_STORE } from "@/lib/ai/route";

/** Which provider is active, and (with ?check=1) whether Ollama is running and the model is pulled. Never returns keys. */
export async function GET(req: Request) {
  await connection();
  const cfg = readAiConfig();
  const sel = selectProvider(cfg, req.headers.get("x-ai-provider"), req.headers.get("x-ollama-preset"));
  const check = new URL(req.url).searchParams.get("check") === "1";
  const ollama = check || sel.provider === "ollama" ? await ollamaStatus(cfg.ollamaBaseUrl, sel.ollamaModel) : null;
  return Response.json(
    {
      demoMode: cfg.demoMode,
      defaultProvider: cfg.defaultProvider,
      active: sel.provider,
      note: sel.note ?? null,
      cloudAvailable: !cfg.demoMode && cfg.defaultProvider === "anthropic" && !!cfg.anthropicKey,
      anthropicModel: cfg.anthropicModel,
      ollamaModel: sel.ollamaModel,
      ollamaBaseUrl: cfg.ollamaBaseUrl,
      ollama,
    },
    { headers: NO_STORE },
  );
}
