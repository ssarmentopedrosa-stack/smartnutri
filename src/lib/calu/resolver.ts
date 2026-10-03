import { fold } from "./domain.ts";
import { TACO_FOODS, type TacoFood } from "./taco.ts";
import type { Per100 } from "./nutrition";

export type NutritionSourceId = "TACO" | "OPEN_FOOD_FACTS" | "USER_CONFIRMED" | "AI_ESTIMATE";

export type ResolvedFood = {
  name: string;
  taco: TacoFood | null;
  source: NutritionSourceId;
  matchConfidence: number;
  per100: Per100 | null;
  liquid: boolean;
};

export const FOOD_ALIASES: Record<string, string> = {
  arroz: "Arroz, tipo 1, cozido",
  "arroz branco": "Arroz, tipo 1, cozido",
  "arroz cozido": "Arroz, tipo 1, cozido",
  "arroz branco cozido": "Arroz, tipo 1, cozido",
  "arroz integral": "Arroz, integral, cozido",
  "arroz integral cozido": "Arroz, integral, cozido",
  feijao: "Feijão, carioca, cozido",
  "feijao carioca": "Feijão, carioca, cozido",
  "feijao preto": "Feijão, preto, cozido",
  frango: "Frango, peito, sem pele, grelhado",
  "peito de frango": "Frango, peito, sem pele, grelhado",
  "frango grelhado": "Frango, peito, sem pele, grelhado",
  ovo: "Ovo, de galinha, inteiro, cozido/10minutos",
  ovos: "Ovo, de galinha, inteiro, cozido/10minutos",
  "ovo cozido": "Ovo, de galinha, inteiro, cozido/10minutos",
  banana: "Banana, prata, crua",
  "pao frances": "Pão, trigo, francês",
  "pao de forma": "Pão, trigo, forma, integral",
  "batata cozida": "Batata, inglesa, cozida",
  "batata frita": "Batata, inglesa, frita",
  cuscuz: "Cuscuz, de milho, cozido com sal",
  tapioca: "Tapioca, com manteiga",
  farofa: "Mandioca, farofa, temperada",
  cafe: "Café, infusão 10%",
  "leite integral": "Leite, de vaca, integral",
  iogurte: "Iogurte, natural",
  queijo: "Queijo, minas, frescal",
  "queijo minas": "Queijo, minas, frescal",
  mussarela: "Queijo, mozarela",
  muçarela: "Queijo, mozarela",
  tofu: "Soja, queijo (tofu)",
  lentilha: "Lentilha, cozida",
  macarrao: "Macarrão, molho bolognesa",
  "carne grelhada": "Carne, bovina, patinho, sem gordura, grelhado",
  patinho: "Carne, bovina, patinho, sem gordura, grelhado",
  acai: "Açaí, polpa, congelada",
  azeite: "Azeite, de oliva, extra virgem",
};

function per100Of(food: TacoFood): Per100 {
  return {
    calories: food.kcal,
    protein: food.protein,
    carbohydrates: food.carbs,
    fat: food.fat,
    fiber: food.fiber,
  };
}

function tokens(value: string): string[] {
  return fold(value)
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 2 && !["com", "sem", "tipo", "cru", "crua"].includes(part));
}

export function resolveFoodName(rawName: string): ResolvedFood {
  const name = rawName.trim().slice(0, 80);
  const key = fold(name);
  const alias = FOOD_ALIASES[key];
  if (alias) {
    const food = TACO_FOODS.find((item) => item.name === alias);
    if (food) {
      return {
        name: food.name,
        taco: food,
        source: "TACO",
        matchConfidence: 0.96,
        per100: per100Of(food),
        liquid: food.liquid,
      };
    }
  }
  const exact = TACO_FOODS.find((item) => fold(item.name) === key || item.aliases.some((alias) => fold(alias) === key));
  if (exact) {
    return {
      name: exact.name,
      taco: exact,
      source: "TACO",
      matchConfidence: 0.93,
      per100: per100Of(exact),
      liquid: exact.liquid,
    };
  }
  const queryTokens = tokens(name);
  let best: { food: TacoFood; score: number } | null = null;
  for (const food of TACO_FOODS) {
    const hay = tokens(`${food.name} ${food.aliases.join(" ")}`);
    if (queryTokens.length === 0 || hay.length === 0) continue;
    const overlap = queryTokens.filter((token) => hay.includes(token)).length;
    const score = overlap / queryTokens.length;
    if (!best || score > best.score) best = { food, score };
  }
  if (best && best.score >= 0.8) {
    return {
      name: best.food.name,
      taco: best.food,
      source: "TACO",
      matchConfidence: Math.min(0.9, 0.7 + best.score * 0.2),
      per100: per100Of(best.food),
      liquid: best.food.liquid,
    };
  }
  return {
    name,
    taco: null,
    source: "AI_ESTIMATE",
    matchConfidence: 0,
    per100: null,
    liquid: false,
  };
}
