import { fold } from "./domain.ts";

export type PortionRule = {
  id: string;
  match: RegExp;
  unit: string;
  grams: number;
  confidence: "high";
  source: "PORTION_CATALOG";
};

/** Conversões com base conhecida. Sem entrada aqui, a unidade não vira gramas. */
export const PORTION_CATALOG: PortionRule[] = [
  { id: "arroz-sopa", match: /arroz/, unit: "colher de sopa", grams: 25, confidence: "high", source: "PORTION_CATALOG" },
  { id: "arroz-colher", match: /arroz/, unit: "colher", grams: 25, confidence: "high", source: "PORTION_CATALOG" },
  { id: "arroz-xicara", match: /arroz/, unit: "xícara", grams: 160, confidence: "high", source: "PORTION_CATALOG" },
  { id: "feijao-sopa", match: /feijao/, unit: "colher de sopa", grams: 20, confidence: "high", source: "PORTION_CATALOG" },
  { id: "feijao-colher", match: /feijao/, unit: "colher", grams: 20, confidence: "high", source: "PORTION_CATALOG" },
  { id: "feijao-xicara", match: /feijao/, unit: "xícara", grams: 140, confidence: "high", source: "PORTION_CATALOG" },
  { id: "feijao-concha", match: /feijao/, unit: "concha", grams: 80, confidence: "high", source: "PORTION_CATALOG" },
  { id: "acucar-sopa", match: /acucar/, unit: "colher de sopa", grams: 12, confidence: "high", source: "PORTION_CATALOG" },
  { id: "acucar-colher", match: /acucar/, unit: "colher", grams: 12, confidence: "high", source: "PORTION_CATALOG" },
  { id: "azeite-sopa", match: /azeite/, unit: "colher de sopa", grams: 8, confidence: "high", source: "PORTION_CATALOG" },
  { id: "azeite-colher", match: /azeite/, unit: "colher", grams: 8, confidence: "high", source: "PORTION_CATALOG" },
  { id: "aveia-sopa", match: /aveia/, unit: "colher de sopa", grams: 10, confidence: "high", source: "PORTION_CATALOG" },
  { id: "aveia-colher", match: /aveia/, unit: "colher", grams: 10, confidence: "high", source: "PORTION_CATALOG" },
  { id: "aveia-xicara", match: /aveia/, unit: "xícara", grams: 30, confidence: "high", source: "PORTION_CATALOG" },
  { id: "leite-xicara", match: /leite/, unit: "xícara", grams: 200, confidence: "high", source: "PORTION_CATALOG" },
  { id: "ovo-unidade", match: /ovo/, unit: "unidade", grams: 50, confidence: "high", source: "PORTION_CATALOG" },
  { id: "banana-unidade", match: /banana/, unit: "unidade", grams: 70, confidence: "high", source: "PORTION_CATALOG" },
  { id: "pao-frances", match: /pao, trigo, frances|pao frances/, unit: "unidade", grams: 50, confidence: "high", source: "PORTION_CATALOG" },
  { id: "pao-frances-fatia", match: /pao, trigo, frances|pao frances/, unit: "fatia", grams: 50, confidence: "high", source: "PORTION_CATALOG" },
  { id: "pao-forma", match: /pao, trigo, forma|pao de forma/, unit: "unidade", grams: 25, confidence: "high", source: "PORTION_CATALOG" },
  { id: "pao-forma-fatia", match: /pao, trigo, forma|pao de forma/, unit: "fatia", grams: 25, confidence: "high", source: "PORTION_CATALOG" },
  { id: "maca", match: /maca/, unit: "unidade", grams: 130, confidence: "high", source: "PORTION_CATALOG" },
  { id: "laranja", match: /laranja/, unit: "unidade", grams: 150, confidence: "high", source: "PORTION_CATALOG" },
];

export function canonicalUnit(unit: string): string {
  const folded = fold(unit).trim();
  if (folded === "xicara") return "xícara";
  if (folded === "colher de sopa") return "colher de sopa";
  if (folded === "colher de cha") return "colher de chá";
  return unit.trim();
}

export function lookupPortion(name: string, unit: string): PortionRule | null {
  const folded = fold(name);
  const wanted = canonicalUnit(unit);
  if (wanted === "colher de chá") return null;
  return PORTION_CATALOG.find((rule) => rule.unit === wanted && rule.match.test(folded)) ?? null;
}
