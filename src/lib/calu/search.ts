import { fold } from "./domain.ts";
import type { Per100 } from "./nutrition";
import { FOOD_ALIASES } from "./resolver.ts";
import { TACO_FOODS, type TacoFood } from "./taco.ts";
import type { NutritionSourceId, ResolvedFood } from "./resolver.ts";

export type SearchConfidence = "high" | "medium" | "low";
export type SearchReason = "exact" | "normalized" | "alias" | "prefix" | "token" | "fuzzy";

export type SearchHit = {
  food: TacoFood;
  score: number;
  reason: SearchReason;
  confidence: SearchConfidence;
};

const STOP = new Set(["com", "sem", "tipo", "cru", "crua", "para", "por", "uma", "uns"]);

const IRREGULAR: Record<string, string> = {
  ovos: "ovo",
  paes: "pao",
  feijoes: "feijao",
  bananas: "banana",
};

const STEMS = new Set<string>();
for (const food of TACO_FOODS) {
  for (const token of fold(food.name).split(/[^a-z0-9]+/)) {
    if (token.length >= 4) STEMS.add(token);
  }
}
for (const key of Object.keys(FOOD_ALIASES)) {
  for (const token of key.split(" ")) if (token.length >= 4) STEMS.add(token);
}

function singular(token: string): string {
  if (IRREGULAR[token]) return IRREGULAR[token];
  if (token.length >= 5 && token.endsWith("s") && !token.endsWith("ss") && !token.endsWith("us")) {
    const stem = token.slice(0, -1);
    if (STEMS.has(stem)) return stem;
  }
  return token;
}

/** Lowercase, sem acento, espaços únicos, plural só quando o radical já existe no catálogo. */
export function normalizeSearch(raw: string): string {
  const folded = fold(raw)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return folded
    .split(" ")
    .filter(Boolean)
    .map(singular)
    .join(" ");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 9;
  const prev = Array.from({ length: b.length + 1 }, (_, index) => index);
  const cur = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i += 1) {
    cur[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      const next = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      cur[j] = next;
      if (next < rowMin) rowMin = next;
    }
    if (rowMin > 2) return 9;
    for (let j = 0; j <= b.length; j += 1) prev[j] = cur[j]!;
  }
  return prev[b.length] ?? 9;
}

function namesOf(food: TacoFood): { value: string; alias: boolean }[] {
  const out: { value: string; alias: boolean }[] = [{ value: normalizeSearch(food.name), alias: false }];
  for (const alias of food.aliases) out.push({ value: normalizeSearch(alias), alias: true });
  for (const [key, target] of Object.entries(FOOD_ALIASES)) {
    if (target === food.name) out.push({ value: normalizeSearch(key), alias: true });
  }
  return out;
}

function scoreFood(queryNorm: string, rawFold: string, food: TacoFood): { score: number; reason: SearchReason } | null {
  if (fold(food.name) === rawFold) return { score: 100, reason: "exact" };
  const names = namesOf(food);
  const exactName = names.find((item) => item.value === queryNorm && !item.alias);
  if (exactName) return { score: 98, reason: "normalized" };
  if (names.some((item) => item.alias && item.value === queryNorm)) return { score: 96, reason: "alias" };
  if (queryNorm.length >= 3 && names.some((item) => item.value.startsWith(`${queryNorm} `) || item.value === queryNorm)) {
    return { score: 88, reason: "prefix" };
  }
  const qTokens = queryNorm.split(" ").filter((token) => token.length > 2 && !STOP.has(token));
  if (qTokens.length === 0) return null;
  let best = 0;
  let fuzzy = false;
  for (const item of names) {
    const hay = new Set(item.value.split(" ").filter((token) => token.length > 2));
    const overlap = qTokens.filter((token) => hay.has(token)).length;
    if (overlap > 0) best = Math.max(best, 58 + (overlap / qTokens.length) * 30);
    if (queryNorm.length >= 5 && Math.abs(item.value.length - queryNorm.length) <= 2) {
      const distance = levenshtein(item.value.slice(0, 48), queryNorm.slice(0, 48));
      if (distance === 1) {
        best = Math.max(best, 74);
        fuzzy = true;
      } else if (distance === 2 && queryNorm.length >= 8) {
        best = Math.max(best, 66);
        fuzzy = true;
      }
    }
  }
  if (best < 64) return null;
  const rounded = Math.round(best);
  if (fuzzy && rounded <= 74) return { score: rounded, reason: "fuzzy" };
  return { score: rounded, reason: "token" };
}

const cache = new Map<string, { at: number; hits: SearchHit[] }>();
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;

function band(score: number, gap: number): SearchConfidence {
  if (score >= 90 && gap >= 12) return "high";
  if (score >= 70) return "medium";
  return "low";
}

export function searchFoods(query: string): SearchHit[] {
  const queryNorm = normalizeSearch(query);
  if (queryNorm.length < 2) return [];
  if (/^\d{8,14}$/.test(queryNorm)) return [];
  const cached = cache.get(queryNorm);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.hits;
  const rawFold = fold(query.trim());
  const ranked = TACO_FOODS.map((food) => {
    const scored = scoreFood(queryNorm, rawFold, food);
    return scored ? { food, ...scored } : null;
  })
    .filter((hit): hit is { food: TacoFood; score: number; reason: SearchReason } => hit != null)
    .sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name, "pt"))
    .slice(0, 8);
  const top = ranked[0];
  const second = ranked[1];
  const gap = top && second ? top.score - second.score : 100;
  const hits: SearchHit[] = ranked.map((hit, index) => ({
    ...hit,
    confidence: index === 0 ? band(hit.score, gap) : hit.score >= 70 ? "medium" : "low",
  }));
  cache.set(queryNorm, { at: Date.now(), hits });
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  return hits;
}

export function searchConfidence(query: string): SearchConfidence {
  const hits = searchFoods(query);
  return hits[0]?.confidence ?? "low";
}

/** High segue sozinho. Medium e low pedem confirmação — nada é gravado em silêncio. */
export function searchNeedsConfirmation(query: string): boolean {
  return searchConfidence(query) !== "high";
}

export function clearSearchCache(): void {
  cache.clear();
}

/**
 * TACO de alta confiança não é substituído por Open Food Facts.
 */
export function preferStructuredSource(input: {
  taco: ResolvedFood | null;
  offPer100: Per100 | null;
}): { source: NutritionSourceId; per100: Per100 | null; keptTaco: boolean } {
  if (input.taco && input.taco.source === "TACO" && input.taco.matchConfidence >= 0.9 && input.taco.per100?.calories != null) {
    return { source: "TACO", per100: input.taco.per100, keptTaco: true };
  }
  if (input.offPer100?.calories != null) {
    return { source: "OPEN_FOOD_FACTS", per100: input.offPer100, keptTaco: false };
  }
  if (input.taco?.per100) return { source: input.taco.source, per100: input.taco.per100, keptTaco: false };
  return { source: "AI_ESTIMATE", per100: null, keptTaco: false };
}
