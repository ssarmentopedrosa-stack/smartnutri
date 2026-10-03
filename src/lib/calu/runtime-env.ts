export type RuntimeKind = "development" | "preview" | "production" | "test";

export type RuntimeEnv = {
  nodeEnv?: string;
  databaseUrl?: string;
  vercelEnv?: string;
  grokProjectId?: string;
  vercel?: string;
  caluEnv?: string;
};

/**
 * development: máquina local e preview sem marca de deploy.
 * preview: VERCEL_ENV=preview (pode usar PGLite se não houver DATABASE_URL).
 * production: CALU_ENV, VERCEL_ENV=production, ou NODE_ENV=production num deploy.
 * test: CALU_ENV=test ou NODE_ENV=test.
 * Preview é decidido antes de production para NODE_ENV=production não virar produção no preview.
 */
export function classifyRuntime(env: RuntimeEnv): RuntimeKind {
  if (env.caluEnv === "test" || env.nodeEnv === "test") return "test";
  if (env.vercelEnv === "preview" || env.caluEnv === "preview") return "preview";
  if (env.caluEnv === "production" || env.vercelEnv === "production") return "production";
  const deployed = Boolean(env.grokProjectId?.trim() || env.vercel === "1");
  if (env.nodeEnv === "production" && deployed) return "production";
  return "development";
}

export function validateRuntime(env: RuntimeEnv): { ok: true; kind: RuntimeKind } | { ok: false; kind: RuntimeKind; missing: string[] } {
  const kind = classifyRuntime(env);
  if (kind === "production" && !env.databaseUrl?.trim()) {
    return { ok: false, kind, missing: ["DATABASE_URL"] };
  }
  return { ok: true, kind };
}
