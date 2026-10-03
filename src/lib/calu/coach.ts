import { z } from "zod";
import { GUILT_PATTERN } from "./domain.ts";
import type { WindowSummary } from "./longitudinal";

export const CoachSchema = z.object({
  observed: z.string().min(8).max(500),
  attention: z.string().min(8).max(500),
  opportunity: z.string().min(8).max(500),
  habit: z.string().min(8).max(400),
});

export type CoachMessage = z.infer<typeof CoachSchema>;

const UNSAFE = /diagn[oó]stic|prescrev|medicament|emagre[cç]|garant(?:o|imos)|perder\s+\d+\s*kg|jejum|compensa(?:r|ção)|dieta terapêutica|nota \d/i;

export function coachIsSafe(message: CoachMessage): boolean {
  const text = `${message.observed} ${message.attention} ${message.opportunity} ${message.habit}`;
  return !UNSAFE.test(text) && !GUILT_PATTERN.test(text);
}

export function parseCoach(raw: unknown): CoachMessage | null {
  const parsed = CoachSchema.safeParse(raw);
  if (!parsed.success) return null;
  if (!coachIsSafe(parsed.data)) return null;
  return parsed.data;
}

export function fallbackCoach(summary: WindowSummary): CoachMessage {
  return {
    observed: summary.patterns[0] ?? "Foi observado apenas o que está registrado nesta janela.",
    attention: "Um ponto de atenção é a completude do registro: dia sem anotação não conta como zero.",
    opportunity: summary.suggestions[0] ?? "Uma oportunidade é manter o registro simples.",
    habit: summary.suggestions[0] ?? "Registrar uma refeição amanhã, se fizer sentido para você.",
  };
}

export const COACH_JSON_HINT = `Responda somente JSON com as chaves observed, attention, opportunity e habit.
observed = o que foi observado nos registros.
attention = um ponto de atenção, sem culpa.
opportunity = uma oportunidade prática.
habit = um micro-hábito opcional para experimentar.
Não diagnostique, não prescreva, não prometa emagrecimento, não sugira compensação nem restrição.`;
