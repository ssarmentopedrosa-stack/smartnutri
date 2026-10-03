import { round1 } from "./domain.ts";

export type DayAgg = {
  day: string;
  meals: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
};

export type Trend = {
  status: "insufficient" | "stable" | "up" | "down";
  points: number;
  deltaKg: number | null;
  narrative: string;
};

export type WindowSummary = {
  span: number;
  recordedDays: number;
  mealCount: number;
  avgCalories: number | null;
  avgProtein: number | null;
  avgCarbohydrates: number | null;
  avgFat: number | null;
  avgFiber: number | null;
  avgWater: number | null;
  weight: Trend;
  consistency: string;
  sampleNote: string;
  patterns: string[];
  suggestions: string[];
  lines: string[];
};

export type DailySummary = {
  meals: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  waterMl: number;
  weightKg: number | null;
  habitsDone: number;
  habitsTotal: number;
  completeness: string;
};

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function weightTrend(points: { day: string; kg: number }[]): Trend {
  const ordered = [...points].filter((point) => Number.isFinite(point.kg)).sort((a, b) => a.day.localeCompare(b.day));
  if (ordered.length < 4) {
    return {
      status: "insufficient",
      points: ordered.length,
      deltaKg: null,
      narrative: "Dados insuficientes para ler tendência de peso.",
    };
  }
  const mid = Math.floor(ordered.length / 2);
  const first = avg(ordered.slice(0, mid).map((point) => point.kg)) ?? 0;
  const second = avg(ordered.slice(mid).map((point) => point.kg)) ?? 0;
  const delta = round1(second - first);
  if (Math.abs(delta) < 0.4) {
    return {
      status: "stable",
      points: ordered.length,
      deltaKg: delta,
      narrative: "A variação de peso nesta janela é pequena. Não dá para tratar isso como uma mudança.",
    };
  }
  return {
    status: delta > 0 ? "up" : "down",
    points: ordered.length,
    deltaKg: delta,
    narrative: `Foi observada uma variação média de ${delta > 0 ? "+" : ""}${String(delta).replace(".", ",")} kg entre o início e o fim da janela. Não é possível determinar causalidade apenas pelos registros.`,
  };
}

export function sampleNote(recordedDays: number, span: number): string {
  if (recordedDays === 0) return "Ainda não há registros nesta janela.";
  if (span <= 1 || recordedDays < 2) return "Dados insuficientes para identificar tendência.";
  if (span < 30) return "Padrão preliminar. Não é possível determinar causalidade apenas pelos registros.";
  return "Tendência mais consistente. Não é possível determinar causalidade apenas pelos registros.";
}

export function getDailySummary(input: {
  meals: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  waterMl: number;
  weightKg: number | null;
  habitsDone: number;
  habitsTotal: number;
  incomplete: boolean;
}): DailySummary {
  const completeness =
    input.meals === 0
      ? "Sem refeição registrada neste dia."
      : input.incomplete
        ? "Registro parcial: algum item ficou sem dado nutricional."
        : "Registro do dia com os itens que você confirmou.";
  return {
    meals: input.meals,
    calories: Math.round(input.calories),
    protein: round1(input.protein),
    carbohydrates: round1(input.carbohydrates),
    fat: round1(input.fat),
    fiber: round1(input.fiber),
    waterMl: Math.round(input.waterMl),
    weightKg: input.weightKg,
    habitsDone: input.habitsDone,
    habitsTotal: input.habitsTotal,
    completeness,
  };
}

export function detectPatterns(input: {
  span: number;
  recorded: DayAgg[];
  waterByDay: { day: string; ml: number }[];
  habitChecks: { day: string; done: boolean }[];
  goals: { protein: number; fiber: number; waterMl: number } | null;
  qualitative: boolean;
  weight: Trend;
}): { patterns: string[]; suggestions: string[] } {
  const patterns: string[] = [];
  const suggestions: string[] = [];
  const recordedDays = input.recorded.length;
  const proteinGoal = input.qualitative ? null : input.goals?.protein;
  const fiberGoal = input.qualitative ? null : input.goals?.fiber;
  if (recordedDays >= 4 && proteinGoal && proteinGoal > 0) {
    const near = input.recorded.filter((day) => day.protein >= proteinGoal * 0.85).length;
    const low = input.recorded.filter((day) => day.protein < proteinGoal * 0.7).length;
    if (low >= Math.ceil(recordedDays * 0.6)) {
      patterns.push("Foi observado que a proteína ficou abaixo da referência em vários dias com registro.");
      suggestions.push("Incluir uma fonte de proteína em uma refeição do dia.");
    } else if (near >= 4) {
      patterns.push(`Os registros mostram proteína próxima da referência em ${near} dias.`);
    }
  }
  if (recordedDays >= 4 && fiberGoal && fiberGoal > 0) {
    const low = input.recorded.filter((day) => day.fiber < fiberGoal * 0.6).length;
    if (low >= Math.ceil(recordedDays * 0.6)) {
      patterns.push("Parece ocorrer pouca fibra nos dias registrados.");
      suggestions.push("Incluir uma fruta ou leguminosa em uma refeição.");
    }
  }
  const waterGoal = input.goals?.waterMl ?? 0;
  if (input.span >= 7 && waterGoal > 0) {
    const covered = input.waterByDay.filter((day) => day.ml >= waterGoal * 0.6).length;
    const any = input.waterByDay.filter((day) => day.ml > 0).length;
    if (covered <= Math.floor(input.span / 3)) {
      patterns.push("A hidratação registrada parece irregular nesta janela.");
      suggestions.push("Beber um copo de água pela manhã.");
    } else if (any >= 5) {
      patterns.push("Nos últimos dias, a ingestão de água ficou mais consistente.");
    }
  }
  if (input.span >= 7 && recordedDays <= 2) {
    patterns.push("O registro ficou irregular. Dias em branco não são tratados como zero.");
    suggestions.push("Registrar o almoço nos dias em que conseguir.");
  } else if (recordedDays >= 5 && input.span >= 7) {
    patterns.push(`Você registrou refeições em ${recordedDays} dos últimos ${input.span} dias.`);
  }
  const done = input.habitChecks.filter((check) => check.done).length;
  if (done >= 5) patterns.push("Há aderência visível aos hábitos que você marcou.");
  if (input.weight.status !== "insufficient" && input.span >= 7) patterns.push(input.weight.narrative);
  if (suggestions.length === 0 && recordedDays > 0) {
    suggestions.push("Registrar uma refeição do dia, se fizer sentido para você.");
  }
  return { patterns, suggestions };
}

export function summarizeWindow(input: {
  span: number;
  mealsByDay: DayAgg[];
  waterByDay: { day: string; ml: number }[];
  weights: { day: string; kg: number }[];
  habitChecks: { day: string; done: boolean }[];
  goals: { protein: number; fiber: number; waterMl: number } | null;
  qualitative: boolean;
}): WindowSummary {
  const recorded = input.mealsByDay.filter((day) => day.meals > 0);
  const recordedDays = recorded.length;
  const mealCount = recorded.reduce((sum, day) => sum + day.meals, 0);
  const mean = (pick: (day: DayAgg) => number) => {
    if (recordedDays === 0) return null;
    return round1(recorded.reduce((sum, day) => sum + pick(day), 0) / recordedDays);
  };
  const waterDays = input.waterByDay.filter((day) => day.ml > 0);
  const avgWater = waterDays.length ? Math.round(waterDays.reduce((sum, day) => sum + day.ml, 0) / waterDays.length) : null;
  const weight = weightTrend(input.weights);
  const note = sampleNote(recordedDays, input.span);
  const { patterns, suggestions } = detectPatterns({
    span: input.span,
    recorded,
    waterByDay: input.waterByDay,
    habitChecks: input.habitChecks,
    goals: input.goals,
    qualitative: input.qualitative,
    weight,
  });
  const consistency =
    recordedDays === 0
      ? "Nenhum dia com refeição nesta janela."
      : `Refeições em ${recordedDays} de ${input.span} dias. A média usa só os dias com registro.`;
  const lines = [consistency, note, ...patterns.slice(0, 3)];
  const avgCalories = mean((day) => day.calories);
  return {
    span: input.span,
    recordedDays,
    mealCount,
    avgCalories: avgCalories == null ? null : Math.round(avgCalories),
    avgProtein: mean((day) => day.protein),
    avgCarbohydrates: mean((day) => day.carbohydrates),
    avgFat: mean((day) => day.fat),
    avgFiber: mean((day) => day.fiber),
    avgWater,
    weight,
    consistency,
    sampleNote: note,
    patterns,
    suggestions,
    lines,
  };
}
