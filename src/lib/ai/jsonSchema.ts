import { z } from "zod";

type Json = { [k: string]: unknown };

const UNSUPPORTED_STRICT = ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "minLength", "maxLength", "minItems", "maxItems", "default", "$schema", "pattern", "format"];

function walk(node: unknown, strict: boolean): unknown {
  if (Array.isArray(node)) return node.map((n) => walk(n, strict));
  if (!node || typeof node !== "object") return node;
  const out: Json = {};
  for (const [k, v] of Object.entries(node as Json)) {
    if (strict && UNSUPPORTED_STRICT.includes(k)) continue;
    if (k === "$schema") continue;
    out[k] = walk(v, strict);
  }
  if (out.type === "object" && out.properties && typeof out.properties === "object") {
    out.additionalProperties = false;
    out.required = Object.keys(out.properties as Json);
  }
  return out;
}

/**
 * JSON Schema for a Zod schema, as the output side sees it (defaults filled in,
 * so every key is required). `strict` also drops keywords that strict tool use
 * does not accept; Zod still enforces them when the result is parsed.
 */
export function jsonSchemaFor(schema: z.ZodType, opts: { strict?: boolean } = {}): Json {
  return walk(z.toJSONSchema(schema, { io: "output", unrepresentable: "any" }), !!opts.strict) as Json;
}
