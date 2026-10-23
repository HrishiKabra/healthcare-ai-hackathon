import type { Question, RedFlag } from "../schemas";
import type { ExtractOutput, ExtractRequest, ProviderName, TranslateOutput, TranslateRequest } from "./schemas";

/** Every AI call goes through this interface. Implementations: mock, anthropic, ollama. */
export interface AiProvider {
  name: Exclude<ProviderName, "baseline">;
  model: string;
  translate(r: TranslateRequest): Promise<TranslateOutput>;
  extract(r: ExtractRequest, q: Question): Promise<ExtractOutput>;
  explain(flag: RedFlag): Promise<string>;
  narrate(handoffText: string): Promise<string>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly kind: "unreachable" | "invalid_output" | "refused" | "timeout" | "http",
  ) {
    super(message);
  }
}
