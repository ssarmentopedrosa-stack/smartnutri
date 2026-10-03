import { classifyRuntime } from "./runtime-env.ts";

/**
 * Decide o backend de banco. PGLite é desenvolvimento, teste e preview sem URL.
 * Produção real sem DATABASE_URL falha — nunca cai em banco efêmero.
 */
export type DbDecision =
  | { source: "neon" }
  | { source: "pglite" }
  | { source: "error"; message: string };

export const PRODUCTION_DB_ERROR =
  "DATABASE_URL é obrigatório em produção. O SmartNutri não inicia com banco efêmero (PGLite) nesse ambiente.";

export function resolveDbBackend(env: {
  nodeEnv?: string;
  databaseUrl?: string;
  vercelEnv?: string;
  grokProjectId?: string;
  vercel?: string;
  caluEnv?: string;
}): DbDecision {
  const url = env.databaseUrl?.trim();
  if (url) return { source: "neon" };
  if (classifyRuntime(env) === "production") return { source: "error", message: PRODUCTION_DB_ERROR };
  return { source: "pglite" };
}
