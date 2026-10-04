import { z } from "zod";
import { extractJson, GUILT_PATTERN } from "./domain.ts";
import { contextHash } from "./daily-board.ts";
import {
  coachContextForModel,
  contextHasPrivateKeys,
  type CoachContext,
} from "./coach-context.ts";
import { parseDay } from "./validation.ts";

export const COACH_STATES = ["GREAT", "ON_TRACK", "NEEDS_ATTENTION", "INCOMPLETE", "NO_DATA"] as const;
export type CoachState = (typeof COACH_STATES)[number];

export const COACH_ACTIONS = ["water", "meal", "diary", "weight", "goals", "none"] as const;
export type CoachAction = (typeof COACH_ACTIONS)[number];

export type CoachCheck = {
  label: string;
  ok: boolean | null;
};

export type DailyCoachCard = {
  state: CoachState;
  title: string;
  message: string;
  action: CoachAction;
  actionLabel: string;
  reason: string;
  checks: CoachCheck[];
};

export type CoachAnswer = {
  state: CoachState;
  title: string;
  message: string;
  support: string;
  reason: string;
  action: CoachAction;
  actionLabel: string;
  source: "rules" | "scope" | "cache" | "ai" | "fallback";
};

export const COACH_UNAVAILABLE = "Não consegui atualizar o Coach agora. Seus dados continuam salvos normalmente.";

const STATE_TITLE: Record<CoachState, string> = {
  GREAT: "Seu dia está muito bem encaminhado.",
  ON_TRACK: "Você está dentro do caminho esperado.",
  NEEDS_ATTENTION: "Há um ponto que vale sua atenção hoje.",
  INCOMPLETE: "Ainda faltam alguns registros para eu avaliar seu dia.",
  NO_DATA: "Ainda não tenho dados suficientes para avaliar seu dia.",
};

const UNSAFE = /diagn[oó]stic|prescrev|medicament|rem[eé]dio|laxante|anorex|bulimi|transtorno alimentar|jejum|emagre[cç]|perder\s+\d+\s*kg|compensa(?:r|ção)|restri[cç][aã]o extrema|dieta terapêutica/i;
const MUTATION = /apague|exclua o registro|altere (as |a )?(calorias|metas|prote[ií]na|gordura)|mude (as |a )?(calorias|metas|prote[ií]na)/i;

const ReplySchema = z.object({
  title: z.string().min(4).max(120),
  message: z.string().min(8).max(400),
  action: z.string().min(2).max(80),
  reason: z.string().min(8).max(400),
  severity: z.literal("low"),
});

export function formatCoachNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1).replace(".", ",");
}

export function formatCoachWater(ml: number): string {
  const safe = Number.isFinite(ml) ? Math.max(0, Math.round(ml)) : 0;
  if (safe >= 1000) {
    const liters = Math.round((safe / 1000) * 10) / 10;
    return `${liters.toFixed(1).replace(".", ",")} L`;
  }
  return `${safe} ml`;
}

function ratio(consumed: number, target: number | null): number | null {
  if (target == null || target <= 0) return null;
  return consumed / target;
}

function trendLine(ctx: CoachContext, signal: "water" | "protein" | "other"): string {
  const bits: string[] = [];
  if (signal !== "water" && ctx.history.waterTrendText && ctx.history.waterTrend !== "down") bits.push(ctx.history.waterTrendText);
  if (signal !== "protein" && ctx.history.proteinTrendText) bits.push(ctx.history.proteinTrendText);
  if (ctx.history.weightText && ctx.tracksWeight) bits.push(ctx.history.weightText);
  return bits.length ? ` ${bits[0]}` : "";
}

export function decideCoach(ctx: CoachContext): DailyCoachCard {
  const checks = coachChecks(ctx);
  const water = ratio(ctx.today.waterMl, ctx.goals.waterMl);
  const protein = ratio(ctx.today.protein, ctx.goals.protein);
  const calories = ratio(ctx.today.calories, ctx.goals.calories);
  const card = (input: {
    state: CoachState;
    message: string;
    action: CoachAction;
    actionLabel: string;
    reason: string;
  }): DailyCoachCard => ({
    state: input.state,
    title: STATE_TITLE[input.state],
    message: input.message,
    action: input.action,
    actionLabel: input.actionLabel,
    reason: input.reason,
    checks,
  });

  if (ctx.today.mealCount === 0 && ctx.today.waterMl === 0 && ctx.today.weightKg == null) {
    return card({
      state: "NO_DATA",
      message: "Quando você registrar uma refeição ou um copo de água, eu aponto um próximo passo.",
      action: "meal",
      actionLabel: "Registrar refeição",
      reason: "Não há refeição, água nem peso neste dia.",
    });
  }

  if (ctx.today.incompleteItems > 0) {
    const count = ctx.today.incompleteItems;
    return card({
      state: "INCOMPLETE",
      message: "Confirme os registros incompletos para o resumo ficar fiel ao que você comeu.",
      action: "diary",
      actionLabel: "Ver diário",
      reason: count === 1 ? "Há 1 registro sem confirmação nutricional." : `Há ${count} registros sem confirmação nutricional.`,
    });
  }

  if (ctx.today.mealCount === 0) {
    return card({
      state: "INCOMPLETE",
      message: "Você ainda pode melhorar seu dia registrando sua próxima refeição.",
      action: "meal",
      actionLabel: "Registrar refeição",
      reason: `A água registrada é ${formatCoachWater(ctx.today.waterMl)}. Ainda não há refeição neste dia.`,
    });
  }

  if (water != null && water < 0.45 && ctx.hour >= 15) {
    return card({
      state: "NEEDS_ATTENTION",
      message: "Seu principal ponto hoje é aumentar a ingestão de água.",
      action: "water",
      actionLabel: "Registrar água",
      reason: `Você registrou ${formatCoachWater(ctx.today.waterMl)} de água hoje, enquanto sua meta é ${formatCoachWater(ctx.goals.waterMl ?? 0)}.`,
    });
  }

  if (!ctx.qualitative && protein != null && protein < 0.5 && ctx.hour >= 16) {
    return card({
      state: "NEEDS_ATTENTION",
      message: "Uma boa próxima ação seria incluir uma fonte de proteína na próxima refeição.",
      action: "meal",
      actionLabel: "Adicionar alimento",
      reason: `A proteína registrada é ${formatCoachNumber(ctx.today.protein)} g e a referência do dia é ${formatCoachNumber(ctx.goals.protein ?? 0)} g.`,
    });
  }

  if (!ctx.qualitative && calories != null && calories > 1.1) {
    return card({
      state: "NEEDS_ATTENTION",
      message: "A energia registrada passou da referência planejada. O próximo registro pode seguir o seu ritmo.",
      action: "diary",
      actionLabel: "Ver diário",
      reason: `As calorias registradas são ${Math.round(ctx.today.calories)} kcal e a referência é ${Math.round(ctx.goals.calories ?? 0)} kcal.`,
    });
  }

  const hasGoal = ctx.goals.waterMl != null || (!ctx.qualitative && (ctx.goals.protein != null || ctx.goals.calories != null));
  const great =
    hasGoal &&
    ctx.today.mealCount >= 2 &&
    (water == null || water >= 0.8) &&
    (ctx.qualitative || protein == null || protein >= 0.8) &&
    (ctx.qualitative || calories == null || (calories >= 0.75 && calories <= 1.05));
  if (great) {
    const habit =
      ctx.today.habitsTotal > 0 && ctx.today.habitsDone >= ctx.today.habitsTotal
        ? " Os hábitos marcados para hoje estão completos."
        : "";
    return card({
      state: "GREAT",
      message: `Você está indo bem. Uma boa próxima ação seria manter a proteína na próxima refeição.${habit}`,
      action: "meal",
      actionLabel: "Adicionar alimento",
      reason: `O dia tem ${ctx.today.mealCount} refeições registradas e os principais marcadores estão na faixa da sua referência.${trendLine(ctx, "other")}`,
    });
  }

  if (ctx.tracksWeight && ctx.today.weightKg == null && ctx.hour >= 18) {
    return card({
      state: "ON_TRACK",
      message: "Se o peso faz parte do seu acompanhamento, você pode atualizá-lo hoje.",
      action: "weight",
      actionLabel: "Atualizar peso",
      reason: "Não há peso registrado neste dia. Isso não altera as refeições já salvas.",
    });
  }

  if (water != null && water < 0.7) {
    return card({
      state: "ON_TRACK",
      message: ctx.hour < 15 ? "Ainda dá tempo de registrar água ao longo do dia." : "Um copo de água cabe bem no restante do dia.",
      action: "water",
      actionLabel: "Registrar água",
      reason: `Você registrou ${formatCoachWater(ctx.today.waterMl)} de água hoje, enquanto sua meta é ${formatCoachWater(ctx.goals.waterMl ?? 0)}.${trendLine(ctx, "water")}`,
    });
  }

  if (!ctx.qualitative && protein != null && protein < 0.7) {
    return card({
      state: "ON_TRACK",
      message: "Você está indo bem. Uma boa próxima ação seria manter a proteína na próxima refeição.",
      action: "meal",
      actionLabel: "Adicionar alimento",
      reason: `A proteína registrada é ${formatCoachNumber(ctx.today.protein)} g e a referência do dia é ${formatCoachNumber(ctx.goals.protein ?? 0)} g.${trendLine(ctx, "protein")}`,
    });
  }

  return card({
    state: "ON_TRACK",
    message: "O próximo passo é seguir registrando o restante do dia.",
    action: ctx.today.mealCount < 2 ? "meal" : "diary",
    actionLabel: ctx.today.mealCount < 2 ? "Registrar refeição" : "Ver diário",
    reason: `Há ${ctx.today.mealCount} refeição(ões) neste dia.${trendLine(ctx, "other")}`,
  });
}

export function coachChecks(ctx: CoachContext): CoachCheck[] {
  const waterTarget = ctx.goals.waterMl;
  const proteinTarget = ctx.goals.protein;
  const calorieTarget = ctx.goals.calories;
  const waterRatio = ratio(ctx.today.waterMl, waterTarget);
  const proteinRatio = ratio(ctx.today.protein, proteinTarget);
  const calorieRatio = ratio(ctx.today.calories, calorieTarget);
  return [
    {
      label:
        waterTarget == null
          ? `Água: ${formatCoachWater(ctx.today.waterMl)}`
          : `Água: ${formatCoachWater(ctx.today.waterMl)} / ${formatCoachWater(waterTarget)}`,
      ok: waterRatio == null ? null : waterRatio >= 0.7,
    },
    {
      label:
        proteinTarget == null
          ? `Proteína: ${formatCoachNumber(ctx.today.protein)} g`
          : `Proteína: ${formatCoachNumber(ctx.today.protein)} / ${formatCoachNumber(proteinTarget)} g`,
      ok: proteinRatio == null ? null : proteinRatio >= 0.7,
    },
    {
      label:
        calorieTarget == null
          ? `Calorias: ${Math.round(ctx.today.calories)} kcal`
          : calorieRatio != null && calorieRatio >= 0.75 && calorieRatio <= 1.1
            ? "Calorias: dentro da faixa"
            : `Calorias: ${Math.round(ctx.today.calories)} / ${Math.round(calorieTarget)} kcal`,
      ok: calorieRatio == null ? null : calorieRatio >= 0.7 && calorieRatio <= 1.1,
    },
  ];
}

function answerShell(ctx: CoachContext, message: string, reason: string, source: CoachAnswer["source"]): CoachAnswer {
  const card = decideCoach(ctx);
  return {
    state: card.state,
    title: card.title,
    message,
    support: card.message,
    reason,
    action: card.action,
    actionLabel: card.actionLabel,
    source,
  };
}

export function coachQuestionScope(question: string): "ok" | "out" {
  if (UNSAFE.test(question) || MUTATION.test(question) || GUILT_PATTERN.test(question)) return "out";
  return "ok";
}

function knownQuestion(ctx: CoachContext, question: string): CoachAnswer | null {
  const q = question.toLowerCase();
  if (/prote[ií]na/.test(q)) {
    const amount = formatCoachNumber(ctx.today.protein);
    const target = ctx.goals.protein;
    const message =
      target == null
        ? `A proteína registrada hoje é ${amount} g. Não há meta numérica configurada para comparar.`
        : `A proteína registrada hoje é ${amount} g, e a referência do dia é ${formatCoachNumber(target)} g.`;
    return answerShell(ctx, message, message, "rules");
  }
  if (/[áa]gua|hidrata/.test(q)) {
    const target = ctx.goals.waterMl;
    const message =
      target == null
        ? `A água registrada hoje é ${formatCoachWater(ctx.today.waterMl)}.`
        : `A água registrada hoje é ${formatCoachWater(ctx.today.waterMl)}, e a meta é ${formatCoachWater(target)}.`;
    return answerShell(ctx, message, message, "rules");
  }
  if (/calor/.test(q)) {
    const amount = Math.round(ctx.today.calories);
    const message = ctx.qualitative || ctx.goals.calories == null
      ? `A meta calórica numérica não é usada neste perfil. O que está registrado hoje soma ${amount} kcal.`
      : `As calorias registradas hoje são ${amount} kcal, e a referência é ${Math.round(ctx.goals.calories)} kcal.`;
    return answerShell(ctx, message, message, "rules");
  }
  if (/peso/.test(q)) {
    const message =
      ctx.today.weightKg != null
        ? `O peso registrado hoje é ${formatCoachNumber(ctx.today.weightKg)} kg.`
        : ctx.history.weightText ?? "Não há peso registrado hoje.";
    return answerShell(ctx, message, message, "rules");
  }
  if (/semana|tend[eê]ncia|últimos 7|ultimos 7/.test(q)) {
    const bits = [`Na janela de 7 dias há refeição em ${ctx.history.recordedDays} dias.`];
    if (!ctx.qualitative && ctx.history.avgCalories != null) bits.push(`A média calórica nos dias com registro é ${ctx.history.avgCalories} kcal.`);
    if (ctx.history.avgProtein != null) bits.push(`A média de proteína nesses dias é ${formatCoachNumber(ctx.history.avgProtein)} g.`);
    if (ctx.history.avgWaterMl != null) bits.push(`A média de água nos dias registrados é ${ctx.history.avgWaterMl} ml.`);
    if (ctx.history.proteinTrendText) bits.push(ctx.history.proteinTrendText);
    if (ctx.history.waterTrendText) bits.push(ctx.history.waterTrendText);
    if (ctx.history.weightText) bits.push(ctx.history.weightText);
    const message = bits.join(" ");
    return answerShell(ctx, message, message, "rules");
  }
  if (/melhorar|como estou|o que posso|pr[oó]ximo passo|meu dia/.test(q)) {
    const card = decideCoach(ctx);
    return answerShell(ctx, `${card.title} ${card.message}`, card.reason, "rules");
  }
  return null;
}

export function normalizeCoachQuestion(question: string): string {
  return question.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 240);
}

export function coachContextHash(ctx: CoachContext): string {
  return contextHash(`v32:${JSON.stringify(coachContextForModel(ctx))}`);
}

export function coachQuestionHash(question: string): string {
  return contextHash(normalizeCoachQuestion(question));
}

export function knownCoachNumbers(ctx: CoachContext): number[] {
  const found: number[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      found.push(value, Math.round(value), Math.round(value * 10) / 10);
      if (Math.abs(value) >= 1000) found.push(Math.round((value / 1000) * 10) / 10);
    } else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(coachContextForModel(ctx));
  return found;
}

export function replyUsesKnownNumbers(text: string, allowed: number[]): boolean {
  const matches = text.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return matches.every((token) => {
    const value = Number(token.replace(",", "."));
    return allowed.some((candidate) => Math.abs(candidate - value) < 0.11);
  });
}

function replyIsSafe(text: string): boolean {
  return !UNSAFE.test(text) && !MUTATION.test(text) && !GUILT_PATTERN.test(text);
}

export function parseCoachReply(raw: unknown, ctx: CoachContext): { title: string; message: string; reason: string } | null {
  const payload = typeof raw === "string" ? extractJson(raw) : raw;
  const parsed = ReplySchema.safeParse(payload);
  if (!parsed.success) return null;
  const text = `${parsed.data.title} ${parsed.data.message} ${parsed.data.action} ${parsed.data.reason}`;
  if (!replyIsSafe(text)) return null;
  if (!replyUsesKnownNumbers(text, knownCoachNumbers(ctx))) return null;
  if (contextHasPrivateKeys(coachContextForModel(ctx))) return null;
  return { title: parsed.data.title, message: parsed.data.message, reason: parsed.data.reason };
}

export function fallbackCoachAnswer(ctx: CoachContext): CoachAnswer {
  const card = decideCoach(ctx);
  return {
    state: card.state,
    title: card.title,
    message: COACH_UNAVAILABLE,
    support: card.message,
    reason: card.reason,
    action: card.action,
    actionLabel: card.actionLabel,
    source: "fallback",
  };
}

export type CoachAskStep =
  | { phase: "done"; answer: CoachAnswer; store: { contextHash: string; questionHash: string; payload: string } | null }
  | { phase: "call"; contextHash: string; questionHash: string };

export function resolveCoachAsk(input: {
  context: CoachContext;
  question: string;
  cached?: { contextHash: string; payload: string } | null;
  modelText?: string | null;
  modelFailed?: boolean;
}): CoachAskStep {
  const contextHashValue = coachContextHash(input.context);
  const questionHash = coachQuestionHash(input.question);
  if (coachQuestionScope(input.question) === "out") {
    return {
      phase: "done",
      store: null,
      answer: answerShell(
        input.context,
        "Não posso orientar diagnóstico, medicamento ou restrição. Posso ajudar a ler os registros de alimentação, água e hábitos que você já salvou.",
        "A pergunta ficou fora do que o Coach interpreta: registros, metas e hábitos.",
        "scope",
      ),
    };
  }
  const direct = knownQuestion(input.context, input.question);
  if (direct) return { phase: "done", answer: direct, store: null };
  if (decideCoach(input.context).state === "NO_DATA") {
    return {
      phase: "done",
      store: null,
      answer: answerShell(
        input.context,
        "Ainda não tenho dados suficientes para avaliar seu dia.",
        "Não há refeição, água nem peso neste dia.",
        "rules",
      ),
    };
  }
  if (input.modelFailed) return { phase: "done", answer: fallbackCoachAnswer(input.context), store: null };
  if (input.modelText != null) {
    const parsed = parseCoachReply(input.modelText, input.context);
    if (!parsed) return { phase: "done", answer: fallbackCoachAnswer(input.context), store: null };
    const answer = answerShell(input.context, parsed.message, parsed.reason, "ai");
    answer.title = parsed.title;
    return {
      phase: "done",
      answer,
      store: { contextHash: contextHashValue, questionHash, payload: JSON.stringify(answer) },
    };
  }
  if (input.cached && input.cached.contextHash === contextHashValue) {
    try {
      const stored = JSON.parse(input.cached.payload) as CoachAnswer;
      if (stored && typeof stored.message === "string" && stored.message.length >= 8 && replyIsSafe(stored.message)) {
        return { phase: "done", answer: { ...stored, source: "cache" }, store: null };
      }
    } catch {
      /* cache inválido cai para a IA */
    }
  }
  return { phase: "call", contextHash: contextHashValue, questionHash };
}

export function parseCoachAsk(input: unknown): { day: string; question: string } {
  const body = (input ?? {}) as Record<string, unknown>;
  const question = String(body.question ?? "").replace(/\s+/g, " ").trim();
  if (question.length < 2 || question.length > 240) throw new Error("Escreva uma pergunta curta para o Coach.");
  return { day: parseDay(body.day), question };
}
