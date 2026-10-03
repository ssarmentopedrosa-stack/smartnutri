import { n as createMiddleware } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/validation-D7j3wXdT.js
/**
* Regras de nutrição, metas e linguagem da Calu.
* Funções puras: a UI e o servidor usam a mesma conta, sem inventar precisão.
*/
var MEAL_TYPES = [
	{
		id: "breakfast",
		label: "Café da manhã"
	},
	{
		id: "lunch",
		label: "Almoço"
	},
	{
		id: "snack",
		label: "Lanche"
	},
	{
		id: "dinner",
		label: "Jantar"
	},
	{
		id: "supper",
		label: "Ceia"
	}
];
var UNITS = [
	"g",
	"kg",
	"ml",
	"L",
	"unidade",
	"fatia",
	"colher",
	"concha",
	"xícara",
	"copo",
	"porção"
];
var GOALS = [
	{
		id: "acompanhar",
		label: "Acompanhar alimentação"
	},
	{
		id: "habitos",
		label: "Melhorar hábitos"
	},
	{
		id: "controlar",
		label: "Controlar peso"
	},
	{
		id: "massa",
		label: "Ganhar massa muscular"
	},
	{
		id: "manter",
		label: "Manter peso"
	},
	{
		id: "outro",
		label: "Outro"
	}
];
var ACTIVITIES = [
	{
		id: "sedentario",
		label: "Sedentário"
	},
	{
		id: "leve",
		label: "Levemente ativo"
	},
	{
		id: "moderado",
		label: "Moderadamente ativo"
	},
	{
		id: "muito",
		label: "Muito ativo"
	}
];
var DIETS = [
	{
		id: "livre",
		label: "Livre"
	},
	{
		id: "vegetariano",
		label: "Vegetariano"
	},
	{
		id: "vegano",
		label: "Vegano"
	},
	{
		id: "outra",
		label: "Outra"
	}
];
var CALORIE_FLOOR = 1500;
var AI_LIMITS = {
	free: {
		image: 5,
		text: 20,
		chat: 15
	},
	premium: {
		image: 40,
		text: 80,
		chat: 80
	}
};
var ANALYTICS_EVENTS = [
	"app_open",
	"onboarding_started",
	"onboarding_completed",
	"photo_started",
	"photo_completed",
	"photo_failed",
	"photo_analysis_started",
	"photo_analysis_completed",
	"meal_created",
	"meal_edited",
	"meal_deleted",
	"food_corrected",
	"portion_corrected",
	"barcode_used",
	"goal_viewed",
	"goal_changed",
	"progress_viewed",
	"weekly_summary_viewed",
	"chat_started",
	"chat_completed",
	"ai_chat_started",
	"habit_created",
	"habit_completed",
	"subscription_viewed",
	"subscription_screen_opened",
	"checkout_started",
	"subscription_started",
	"subscription_cancelled",
	"voice_meal_created"
];
var GENERIC_GOALS = {
	calories: 2e3,
	protein: 100,
	carbohydrates: 220,
	fat: 65,
	fiber: 25,
	waterMl: 2500
};
function round1(n) {
	return Math.round(n * 10) / 10;
}
function mealLabel(id) {
	return MEAL_TYPES.find((m) => m.id === id)?.label ?? "Refeição";
}
function emptyMacros() {
	return {
		calories: 0,
		protein: 0,
		carbohydrates: 0,
		fat: 0,
		fiber: 0,
		incomplete: true
	};
}
function sumFoods(foods) {
	if (foods.length === 0) return emptyMacros();
	let incomplete = false;
	let calories = 0;
	let protein = 0;
	let carbohydrates = 0;
	let fat = 0;
	let fiber = 0;
	for (const food of foods) {
		if (food.calories == null) incomplete = true;
		else calories += food.calories;
		if (food.protein == null) incomplete = true;
		else protein += food.protein;
		if (food.carbohydrates == null) incomplete = true;
		else carbohydrates += food.carbohydrates;
		if (food.fat == null) incomplete = true;
		else fat += food.fat;
		if (food.fiber == null) incomplete = true;
		else fiber += food.fiber;
	}
	return {
		calories: Math.round(calories),
		protein: round1(protein),
		carbohydrates: round1(carbohydrates),
		fat: round1(fat),
		fiber: round1(fiber),
		incomplete
	};
}
function scaleNullable(value, ratio, digits) {
	if (value == null) return null;
	const next = value * ratio;
	return digits === 0 ? Math.round(next) : round1(next);
}
function sanitizeQty(quantity) {
	if (!Number.isFinite(quantity) || quantity <= 0) return 0;
	return Math.min(1e4, round1(quantity));
}
function withQuantity(food, quantity) {
	const next = sanitizeQty(quantity);
	const ratio = food.baseQuantity > 0 ? next / food.baseQuantity : 1;
	return {
		...food,
		quantity: next,
		calories: scaleNullable(food.baseCalories, ratio, 0),
		protein: scaleNullable(food.baseProtein, ratio, 1),
		carbohydrates: scaleNullable(food.baseCarbohydrates, ratio, 1),
		fat: scaleNullable(food.baseFat, ratio, 1),
		fiber: scaleNullable(food.baseFiber, ratio, 1)
	};
}
function commitDraft(food) {
	return {
		...food,
		baseQuantity: food.quantity > 0 ? food.quantity : 1,
		baseCalories: food.calories,
		baseProtein: food.protein,
		baseCarbohydrates: food.carbohydrates,
		baseFat: food.fat,
		baseFiber: food.fiber
	};
}
function quantityStep(unit) {
	switch (unit) {
		case "g": return 10;
		case "kg": return .1;
		case "ml": return 25;
		case "L": return .1;
		case "colher":
		case "porção": return .5;
		default: return 1;
	}
}
function makeFood(partial) {
	const quantity = sanitizeQty(partial.quantity) || 1;
	return commitDraft({
		id: partial.id,
		name: partial.name.trim().slice(0, 80),
		quantity,
		unit: partial.unit,
		calories: partial.calories,
		protein: partial.protein,
		carbohydrates: partial.carbohydrates,
		fat: partial.fat,
		fiber: partial.fiber,
		confidence: partial.confidence ?? null,
		source: partial.source,
		dataStatus: partial.dataStatus,
		baseQuantity: quantity,
		baseCalories: partial.calories,
		baseProtein: partial.protein,
		baseCarbohydrates: partial.carbohydrates,
		baseFat: partial.fat,
		baseFiber: partial.fiber
	});
}
function routeConfidence(identification, portion) {
	const id = identification ?? .4;
	const portionScore = portion ?? .4;
	if (id >= .85 && portionScore >= .8) return "high";
	if (id < .55 || portionScore < .5) return "low";
	return "medium";
}
var LEGAL_VERSIONS = {
	consent: "2026-10-03",
	terms: "2026-10-03",
	privacy: "2026-10-03"
};
function estimateGoals(input) {
	const { age, heightCm, weightKg } = input;
	if (age != null && age < 18) return {
		targets: {
			calories: 0,
			protein: 0,
			carbohydrates: 0,
			fat: 0,
			fiber: 0,
			waterMl: age < 14 ? 1600 : 2e3
		},
		personal: false,
		qualitative: true,
		audience: "minor",
		note: "Para menores de 18 anos a Calu não calcula meta calórica adulta nem déficit. O acompanhamento é o registro, a hidratação, os hábitos e a orientação de um responsável ou profissional quando necessário."
	};
	if (age == null || heightCm == null || weightKg == null || age < 18 || heightCm < 120 || weightKg < 30) return {
		targets: GENERIC_GOALS,
		personal: false,
		qualitative: false,
		audience: "insufficient",
		note: "Sem idade, altura e peso suficientes, usamos uma referência genérica. Não é uma meta pessoal e não substitui orientação profissional."
	};
	const sexConst = input.sex === "masculino" ? 5 : input.sex === "feminino" ? -161 : -78;
	const raw = (10 * weightKg + 6.25 * heightCm - 5 * age + sexConst) * (input.activity === "sedentario" ? 1.2 : input.activity === "leve" ? 1.375 : input.activity === "moderado" ? 1.55 : 1.725) * (input.goal === "controlar" ? .85 : input.goal === "massa" ? 1.12 : 1);
	const calories = Math.max(CALORIE_FLOOR, Math.round(raw));
	const protein = round1(weightKg * (input.goal === "massa" ? 1.6 : input.goal === "controlar" ? 1.4 : 1.2));
	let fat = round1(calories * .28 / 9);
	let carbohydrates = round1((calories - protein * 4 - fat * 9) / 4);
	if (carbohydrates < 0) {
		fat = round1(Math.max(35, (calories - protein * 4) / 9));
		carbohydrates = round1(Math.max(0, (calories - protein * 4 - fat * 9) / 4));
	}
	const fiber = Math.max(25, Math.round(14 * calories / 1e3));
	const waterMl = Math.min(3500, Math.max(2e3, Math.round(35 * weightKg / 50) * 50));
	return {
		personal: true,
		qualitative: false,
		audience: "adult",
		targets: {
			calories,
			protein,
			carbohydrates,
			fat,
			fiber,
			waterMl
		},
		note: raw < 1500 ? "Referência diária estimada pela equação de Mifflin-St Jeor e pelo seu objetivo. O valor foi limitado para não sugerir uma ingestão muito baixa. Não substitui orientação profissional." : "Referência diária estimada pela equação de Mifflin-St Jeor e pelo seu objetivo. Não substitui orientação profissional."
	};
}
function localInsight(input) {
	if (input.mealCount === 0) return "Quando quiser, registre uma refeição. Não precisa ser perfeito — uma estimativa já ajuda a enxergar o dia.";
	const proteinRatio = input.goals.protein > 0 ? input.totals.protein / input.goals.protein : 0;
	const fiberRatio = input.goals.fiber > 0 ? input.totals.fiber / input.goals.fiber : 0;
	const calorieRatio = input.goals.calories > 0 ? input.totals.calories / input.goals.calories : 0;
	const waterRatio = input.goals.waterMl > 0 ? input.waterMl / input.goals.waterMl : 0;
	if (calorieRatio > 1.15) return "Hoje o consumo registrado ficou acima da meta estimada. Se quiser, podemos observar como isso se comporta ao longo da semana.";
	if (proteinRatio >= .85) return "Hoje sua ingestão de proteína ficou próxima da meta estimada.";
	if (fiberRatio < .45 && input.mealCount >= 2) return "Você registrou poucas fontes de fibras hoje.";
	if (waterRatio < .5 && input.hour >= 15) return "Seu consumo de água está abaixo da meta registrada.";
	if (proteinRatio < .45) return "Até agora, a proteína registrada está distante da meta estimada. Isso é só um retrato do que foi anotado.";
	return "Seu dia está sendo registrado. As metas são estimativas — o mais útil é a consistência, não um número isolado.";
}
var PROTEIN_OPTIONS = {
	vegano: [
		"feijão",
		"lentilha",
		"tofu",
		"grão-de-bico"
	],
	vegetariano: [
		"ovos",
		"iogurte",
		"queijo",
		"feijão"
	],
	livre: [
		"ovos",
		"frango",
		"feijão",
		"iogurte"
	],
	outra: [
		"feijão",
		"ovos",
		"iogurte",
		"tofu"
	]
};
function recommend(input) {
	const proteinLeft = input.goals.protein - input.totals.protein;
	if (input.totals.calories > input.goals.calories * 1.05 && input.totals.calories > 0) return "Não é preciso compensar com restrição. A próxima refeição pode ter o tamanho que fizer sentido para você.";
	if (proteinLeft > 25 && !input.mealTypes.includes("dinner") && input.mealTypes.length > 0) {
		const blocked = input.memory.join(" ").toLowerCase();
		return `No jantar, uma fonte simples de proteína pode aproximar você da meta estimada: ${PROTEIN_OPTIONS[input.diet].filter((item) => {
			if (input.diet === "vegano" && /ovo|iogurte|queijo|frango|peixe|leite/.test(item)) return false;
			if (/peixe/.test(item) && /peixe/.test(blocked) && /n[aã]o gosta|evita|sem /.test(blocked)) return false;
			if (/frango/.test(blocked) && /n[aã]o gosta|evita/.test(blocked) && item === "frango") return false;
			return true;
		}).slice(0, 3).join(", ")}.`;
	}
	if (input.goals.fiber - input.totals.fiber > 10 && input.mealTypes.length > 0) return "Fruta, feijão, salada ou aveia são formas simples de incluir fibras, se isso combinar com o que você come.";
	return null;
}
function summarizeHistory(input) {
	const recordedDays = new Set(input.meals.map((m) => m.day)).size;
	if (recordedDays === 0) return {
		recordedDays: 0,
		avgCalories: null,
		avgProtein: null,
		avgWater: null,
		narrative: "Ainda não há registros neste período. Quando você registrar, o histórico aparece aqui."
	};
	const byDay = /* @__PURE__ */ new Map();
	for (const meal of input.meals) {
		const cur = byDay.get(meal.day) ?? {
			calories: 0,
			protein: 0
		};
		cur.calories += meal.calories;
		cur.protein += meal.protein;
		byDay.set(meal.day, cur);
	}
	let cal = 0;
	let pro = 0;
	for (const value of byDay.values()) {
		cal += value.calories;
		pro += value.protein;
	}
	const waterDays = input.waterByDay.filter((w) => w.ml > 0);
	const avgWater = waterDays.length === 0 ? null : Math.round(waterDays.reduce((s, w) => s + w.ml, 0) / waterDays.length);
	const label = input.span === 1 ? "hoje" : `em ${recordedDays} dos últimos ${input.span} dias`;
	const narrative = input.span === 1 ? recordedDays ? "Há registro de refeição hoje." : "Ainda não há registro hoje." : `Você registrou refeições ${label}. A média considera só os dias com registro, não os dias em branco.`;
	return {
		recordedDays,
		avgCalories: Math.round(cal / recordedDays),
		avgProtein: round1(pro / recordedDays),
		avgWater,
		narrative
	};
}
var CRISIS = /anorexia|bulimia|n[aã]o consigo parar de vomitar|quero sumir|me matar|suicid|n[aã]o quero mais viver/i;
var CLINICAL = /diagn[oó]stic|rem[eé]dio|medicamento|posologia|exame de sangue|interprete meu exame|infarto|falta de ar|glicemia|press[aã]o alta|posso parar de tomar/i;
var EXTREME = /dieta de\s*[5-9]\d{2}|jejum de\s+\d+\s*dias|perder\s+\d+\s*kg\s+em\s+\d+\s*dias|800\s*kcal/i;
function safetyReply(message) {
	if (CRISIS.test(message)) return "Isso merece cuidado de uma pessoa, não de um aplicativo. Se você está em sofrimento agora, procure um serviço de saúde ou alguém de confiança. No Brasil, o CVV atende em 188, 24 horas. A Calu não orienta esse tema.";
	if (CLINICAL.test(message)) return "Essa questão merece avaliação de um profissional de saúde. A Calu não diagnostica, não interpreta exames e não prescreve medicamentos ou dietas terapêuticas.";
	if (EXTREME.test(message)) return "Não vou sugerir restrição extrema nem uma meta agressiva de peso. Um profissional de saúde pode orientar com segurança. Posso ajudar a registrar o que você comer e a entender o dia.";
	return null;
}
function memoryCommand(message) {
	return message.trim().match(/^(?:lembre(?:\s+que)?|guarde(?:\s+que)?|memorize(?:\s+que)?)\s+(.{3,240})$/i)?.[1]?.trim() ?? null;
}
function asksMemory(message) {
	return /o que (você|voce) sabe|minha mem[oó]ria|quais h[aá]bitos|o que guardou/i.test(message);
}
function numOrNull(value) {
	if (value == null || value === "") return null;
	const n = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(n) || n < 0) return null;
	return n;
}
function asMealType(value, hour) {
	const text = String(value ?? "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
	if (text.includes("breakfast") || text.includes("cafe")) return "breakfast";
	if (text.includes("lunch") || text.includes("almoco")) return "lunch";
	if (text.includes("snack") || text.includes("lanche")) return "snack";
	if (text.includes("dinner") || text.includes("jantar")) return "dinner";
	if (text.includes("supper") || text.includes("ceia")) return "supper";
	if (hour < 10) return "breakfast";
	if (hour < 15) return "lunch";
	if (hour < 18) return "snack";
	if (hour < 22) return "dinner";
	return "supper";
}
function extractJson(text) {
	const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
	try {
		return JSON.parse(trimmed);
	} catch {}
	const start = trimmed.indexOf("{");
	const end = trimmed.lastIndexOf("}");
	if (start >= 0 && end > start) try {
		return JSON.parse(trimmed.slice(start, end + 1));
	} catch {
		return null;
	}
	return null;
}
function parseAnalysis(raw, hour = 12) {
	if (!raw || typeof raw !== "object") return null;
	const body = raw;
	if (!Array.isArray(body.foods)) return null;
	const foods = [];
	for (const item of body.foods.slice(0, 12)) {
		const name = String(item.name ?? "").trim();
		if (!name) continue;
		const quantity = numOrNull(item.estimatedQuantity ?? item.quantity) ?? 1;
		const unit = UNITS.includes(String(item.unit)) ? String(item.unit) : "g";
		const confidence = numOrNull(item.confidence);
		const identification = numOrNull(item.identificationConfidence ?? item.confidence);
		const portion = numOrNull(item.portionConfidence ?? item.confidence);
		const draft = makeFood({
			id: crypto.randomUUID(),
			name,
			quantity,
			unit,
			calories: numOrNull(item.calories) == null ? null : Math.round(numOrNull(item.calories)),
			protein: numOrNull(item.protein) == null ? null : round1(numOrNull(item.protein)),
			carbohydrates: numOrNull(item.carbohydrates) == null ? null : round1(numOrNull(item.carbohydrates)),
			fat: numOrNull(item.fat) == null ? null : round1(numOrNull(item.fat)),
			fiber: numOrNull(item.fiber) == null ? null : round1(numOrNull(item.fiber)),
			confidence: confidence == null ? null : Math.max(0, Math.min(1, confidence)),
			source: "ai",
			dataStatus: numOrNull(item.calories) == null ? "unavailable" : "estimate"
		});
		foods.push({
			...draft,
			identificationConfidence: identification == null ? null : Math.max(0, Math.min(1, identification)),
			portionConfidence: portion == null ? null : Math.max(0, Math.min(1, portion)),
			nutritionSource: "AI_ESTIMATE",
			nutritionConfidence: numOrNull(item.calories) == null ? 0 : .35,
			review: routeConfidence(identification, portion)
		});
	}
	const uncertainties = Array.isArray(body.uncertainties) ? body.uncertainties.map((u) => String(u).trim()).filter(Boolean).slice(0, 6) : [];
	const insight = String(body.insight ?? "").replace(/\s+/g, " ").trim().slice(0, 320);
	return {
		mealType: asMealType(body.mealType, hour),
		foods,
		uncertainties,
		insight
	};
}
function fold(value) {
	return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function formatQty(quantity, unit) {
	return `${Number.isInteger(quantity) ? String(quantity) : String(round1(quantity))} ${unit}`;
}
function macroLine(value, unit) {
	if (value == null) return "Dados não disponíveis";
	return `${Number.isInteger(value) ? String(value) : String(value).replace(".", ",")} ${unit}`;
}
var GUILT_PATTERN = /você errou|estragou sua dieta|comeu demais|fracassou|nota \d/i;
/**
* Auth middleware for server functions — the standard way to get the caller's
* verified user id. When deployed the session cookie is same-origin and rides
* along automatically. In the live preview the client also forwards the bearer
* token (partitioned cookies) via the `.client` hook below — call sites do not
* thread it themselves.
*
*   import { createServerFn } from "@tanstack/react-start";
*   import { getSql } from "@/lib/db";
*   import { authMiddleware } from "@/lib/auth/middleware";
*
*   export const listTodos = createServerFn({ method: "GET" })
*     .middleware([authMiddleware])
*     .handler(async ({ context }) => {
*       const sql = await getSql();
*       return sql`select * from todos where user_id = ${context.userId}`;
*     });
*
* Signed out with auth on (live preview included) -> throws `UnauthorizedError`
* (see `verify.server.ts`). With auth disabled (`VITE_AUTH_ENABLED=false`, the
* shipped default) it resolves the shared dev user — but throws instead when a
* `DATABASE_URL` is also set, so an app without sign-in must not use this at
* all. On the auth-on path, use it on every server function that touches
* per-user data and scope every query by `context.userId`.
*/
var authMiddleware = createMiddleware({ type: "function" }).client(async ({ next }) => {
	const { getBearerToken } = await import("./client-DPVtbdLl.mjs").then((n) => n.n).then((n) => n.n);
	return next({ sendContext: { bearerToken: getBearerToken() ?? void 0 } });
}).server(async ({ next, context }) => {
	const { assertSameSiteRequest } = await import("./isolation.server-CGNg1r0B.mjs");
	const { requireUserId } = await import("./verify.server-C0YQje4T.mjs");
	assertSameSiteRequest();
	return next({ context: { userId: await requireUserId(context.bearerToken) } });
});
function parseDay(value) {
	const day = String(value ?? "");
	if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Data inválida.");
	const [year, month, date] = day.split("-").map(Number);
	const parsed = new Date(Date.UTC(year, month - 1, date));
	if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== date) throw new Error("Data inválida.");
	return day;
}
function parseEntityId(value) {
	const id = String(value ?? "");
	if (!/^[0-9a-f-]{16,40}$/i.test(id)) throw new Error("Registro inválido.");
	return id;
}
function parseBarcode(value) {
	const digits = String(value ?? "").replace(/\D/g, "");
	if (digits.length < 8 || digits.length > 14) throw new Error("Código inválido.");
	return digits;
}
function parseImageBase64(value) {
	let image = String(value ?? "");
	const embedded = image.match(/base64,([A-Za-z0-9+/=\s]+)$/);
	if (embedded) image = embedded[1] ?? "";
	image = image.replace(/\s/g, "");
	if (image.length < 80 || image.length > 14e5 || !/^[A-Za-z0-9+/=]+$/.test(image)) throw new Error("Não consegui ler essa foto. Tente outra, mais próxima e em JPG.");
	const jpeg = image.startsWith("/9j/");
	const png = image.startsWith("iVBOR");
	const webp = image.startsWith("UklGR");
	if (!jpeg && !png && !webp) throw new Error("Use uma foto JPG, PNG ou WEBP.");
	return image;
}
//#endregion
export { routeConfidence as A, parseBarcode as C, quantityStep as D, parseImageBase64 as E, sumFoods as M, summarizeHistory as N, recommend as O, withQuantity as P, parseAnalysis as S, parseEntityId as T, localInsight as _, GOALS as a, mealLabel as b, MEAL_TYPES as c, authMiddleware as d, commitDraft as f, formatQty as g, fold as h, DIETS as i, safetyReply as j, round1 as k, UNITS as l, extractJson as m, AI_LIMITS as n, GUILT_PATTERN as o, estimateGoals as p, ANALYTICS_EVENTS as r, LEGAL_VERSIONS as s, ACTIVITIES as t, asksMemory as u, macroLine as v, parseDay as w, memoryCommand as x, makeFood as y };
