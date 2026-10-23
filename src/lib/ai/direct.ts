import type { AiCalls } from "./pipeline";
import type { AiProvider } from "./provider";
import { runExtract, runTranslate } from "./server";

/** AiCalls that run a provider in-process (tests, the eval script). Same fallbacks as the API routes. */
export function directCalls(provider: AiProvider): AiCalls {
  return {
    translate: (r) => runTranslate(provider, r),
    extract: (r) => runExtract(provider, r),
  };
}
