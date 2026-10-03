export type QuotaKind = "image" | "text" | "chat";

const COLUMN: Record<QuotaKind, "image_count" | "text_count" | "chat_count"> = {
  image: "image_count",
  text: "text_count",
  chat: "chat_count",
};

export function quotaColumn(kind: QuotaKind): "image_count" | "text_count" | "chat_count" {
  return COLUMN[kind];
}

export function ensureUsageSql(): string {
  return `insert into ai_usage (user_id, day, image_count, text_count, chat_count)
          values ($1, $2, 0, 0, 0)
          on conflict (user_id, day) do nothing`;
}

export function reserveQuotaSql(kind: QuotaKind): string {
  const column = COLUMN[kind];
  return `update ai_usage
          set ${column} = ${column} + 1
          where user_id = $1 and day = $2 and ${column} < $3
          returning ${column}`;
}

export function releaseQuotaSql(kind: QuotaKind): string {
  const column = COLUMN[kind];
  return `update ai_usage
          set ${column} = ${column} - 1
          where user_id = $1 and day = $2 and ${column} > 0`;
}
