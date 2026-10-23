import type { z } from "zod";

/** Parses a JSON body against a schema without ever logging it. */
export async function parseBody<T>(req: Request, schema: z.ZodType<T>): Promise<{ ok: true; data: T } | { ok: false; res: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, res: Response.json({ error: "Body must be JSON" }, { status: 400 }) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, res: Response.json({ error: "Invalid request", issues: parsed.error.issues.map((i) => i.path.join(".")) }, { status: 400 }) };
  return { ok: true, data: parsed.data };
}

export const NO_STORE = { "cache-control": "no-store" };
