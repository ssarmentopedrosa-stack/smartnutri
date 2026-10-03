import { i as TSS_SERVER_FUNCTION, r as createServerFn, s as __exportAll } from "./ssr.mjs";
import { C as parseBarcode, E as parseImageBase64, M as sumFoods, P as withQuantity, T as parseEntityId, a as GOALS, b as mealLabel, c as MEAL_TYPES, d as authMiddleware, i as DIETS, j as safetyReply, k as round1, l as UNITS, m as extractJson, n as AI_LIMITS, o as GUILT_PATTERN, p as estimateGoals, r as ANALYTICS_EVENTS, s as LEGAL_VERSIONS, t as ACTIVITIES, u as asksMemory, w as parseDay, x as memoryCommand, y as makeFood } from "./validation-D7j3wXdT.mjs";
import { r as getSql } from "./db-CQcbaluU.mjs";
import { a as enrichAnalysis } from "./pipeline-B2RyjoBE.mjs";
import { i as shiftDayKey, n as dayKeyInTimeZone, r as isValidTimeZone } from "./timezone-DDJkhpN0.mjs";
import { hn as object, vn as string } from "../_libs/@better-auth/core+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api-B_xaOrbA.js
var CoachSchema = object({
	observed: string().min(8).max(500),
	attention: string().min(8).max(500),
	opportunity: string().min(8).max(500),
	habit: string().min(8).max(400)
});
var UNSAFE = /diagn[oó]stic|prescrev|medicament|emagre[cç]|garant(?:o|imos)|perder\s+\d+\s*kg|jejum|compensa(?:r|ção)|dieta terapêutica|nota \d/i;
function coachIsSafe(message) {
	const text = `${message.observed} ${message.attention} ${message.opportunity} ${message.habit}`;
	return !UNSAFE.test(text) && !GUILT_PATTERN.test(text);
}
function parseCoach(raw) {
	const parsed = CoachSchema.safeParse(raw);
	if (!parsed.success) return null;
	if (!coachIsSafe(parsed.data)) return null;
	return parsed.data;
}
function fallbackCoach(summary) {
	return {
		observed: summary.patterns[0] ?? "Foi observado apenas o que está registrado nesta janela.",
		attention: "Um ponto de atenção é a completude do registro: dia sem anotação não conta como zero.",
		opportunity: summary.suggestions[0] ?? "Uma oportunidade é manter o registro simples.",
		habit: summary.suggestions[0] ?? "Registrar uma refeição amanhã, se fizer sentido para você."
	};
}
var COACH_JSON_HINT = `Responda somente JSON com as chaves observed, attention, opportunity e habit.
observed = o que foi observado nos registros.
attention = um ponto de atenção, sem culpa.
opportunity = uma oportunidade prática.
habit = um micro-hábito opcional para experimentar.
Não diagnostique, não prescreva, não prometa emagrecimento, não sugira compensação nem restrição.`;
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var SECRET = /api[_-]?key|authorization|bearer|token|password|secret/i;
function newRequestId() {
	return crypto.randomUUID();
}
function logEvent(event, fields = {}) {
	const safe = {
		event,
		ts: (/* @__PURE__ */ new Date()).toISOString()
	};
	for (const [key, value] of Object.entries(fields)) {
		if (SECRET.test(key)) continue;
		if (typeof value === "string" && value.length > 300) continue;
		safe[key] = value;
	}
	console.info(JSON.stringify(safe));
}
var COLUMN = {
	image: "image_count",
	text: "text_count",
	chat: "chat_count"
};
function ensureUsageSql() {
	return `insert into ai_usage (user_id, day, image_count, text_count, chat_count)
          values ($1, $2, 0, 0, 0)
          on conflict (user_id, day) do nothing`;
}
function reserveQuotaSql(kind) {
	const column = COLUMN[kind];
	return `update ai_usage
          set ${column} = ${column} + 1
          where user_id = $1 and day = $2 and ${column} < $3
          returning ${column}`;
}
function releaseQuotaSql(kind) {
	const column = COLUMN[kind];
	return `update ai_usage
          set ${column} = ${column} - 1
          where user_id = $1 and day = $2 and ${column} > 0`;
}
var RATE_LIMITS = {
	analyzePhoto: 8,
	analyzeText: 12,
	sendChat: 20,
	lookupBarcode: 30,
	askInsight: 10,
	weeklyCoach: 4
};
function rateWindowId(nowMs, windowMs = 6e4) {
	return Math.floor(nowMs / windowMs);
}
var HIT_RATE_SQL = `insert into rate_limits (user_id, action, window_id, hits)
  values ($1, $2, $3, 1)
  on conflict (user_id, action, window_id)
  do update set hits = rate_limits.hits + 1
  returning hits`;
var QUOTA_LABEL = {
	image: "análises de foto",
	text: "interpretações de texto",
	chat: "mensagens para a Calu"
};
async function effectivePlan(sql, userId) {
	return (await sql`
    select plan, status from subscriptions
    where user_id = ${userId} and status in ('active', 'trialing')
    order by updated_at desc
    limit 1
  `)[0]?.plan === "premium" ? "premium" : "free";
}
async function quotaDay(sql, userId, now = /* @__PURE__ */ new Date()) {
	const rows = await sql`select timezone from profiles where user_id = ${userId}`;
	return dayKeyInTimeZone(now, rows[0]?.timezone || "America/Sao_Paulo");
}
async function isMinorUser(sql, userId) {
	const rows = await sql`select age from profiles where user_id = ${userId}`;
	const age = Number(rows[0]?.age);
	return Number.isFinite(age) && age > 0 && age < 18;
}
async function reserveQuota(sql, userId, day, kind) {
	const plan = await effectivePlan(sql, userId);
	const limit = AI_LIMITS[plan][kind];
	if (await sql.transaction(async (tx) => {
		await tx.query(ensureUsageSql(), [userId, day]);
		return (await tx.query(reserveQuotaSql(kind), [
			userId,
			day,
			limit
		])).length > 0;
	})) return { ok: true };
	const label = plan === "premium" ? "Premium" : "gratuito";
	return {
		ok: false,
		error: `Você chegou ao limite de ${limit} ${QUOTA_LABEL[kind]} de hoje no plano ${label}. O registro manual continua disponível.`
	};
}
async function releaseQuota(sql, userId, day, kind) {
	await sql.query(releaseQuotaSql(kind), [userId, day]);
}
async function hitRateLimit(sql, userId, action, nowMs = Date.now()) {
	const windowId = rateWindowId(nowMs);
	const rows = await sql.query(HIT_RATE_SQL, [
		userId,
		action,
		windowId
	]);
	if (Number(rows[0]?.hits ?? 0) > RATE_LIMITS[action]) return {
		ok: false,
		error: "Muitas tentativas em pouco tempo. Espere um minuto e tente de novo."
	};
	return { ok: true };
}
async function recordAiCall(sql, input) {
	const estimated = input.inputTokens == null && input.outputTokens == null ? null : ((input.inputTokens ?? 0) * (input.provider === "gemini" ? .15 : 2) + (input.outputTokens ?? 0) * (input.provider === "gemini" ? .6 : 6)) / 1e6;
	await sql`
    insert into ai_calls (
      id, user_id, operation, provider, model, input_tokens, output_tokens, estimated_cost,
      success, duration_ms, request_id
    ) values (
      ${crypto.randomUUID()}, ${input.userId}, ${input.operation}, ${input.provider}, ${input.model},
      ${input.inputTokens}, ${input.outputTokens}, ${estimated}, ${input.success}, ${input.durationMs},
      ${input.requestId}
    )
  `;
}
async function findOwnedMeal(sql, userId, mealId) {
	return (await sql.query("select id from meals where id = $1 and user_id = $2", [mealId, userId]))[0] ?? null;
}
async function wipeUserData(sql, userId) {
	await sql`delete from food_items where user_id = ${userId}`;
	await sql`delete from meals where user_id = ${userId}`;
	await sql`delete from water_logs where user_id = ${userId}`;
	await sql`delete from weight_logs where user_id = ${userId}`;
	await sql`delete from habit_checks where user_id = ${userId}`;
	await sql`delete from habits where user_id = ${userId}`;
	await sql`delete from micro_habits where user_id = ${userId}`;
	await sql`delete from ai_messages where user_id = ${userId}`;
	await sql`delete from ai_memory where user_id = ${userId}`;
	await sql`delete from ai_usage where user_id = ${userId}`;
	await sql`delete from ai_calls where user_id = ${userId}`;
	await sql`delete from notification_prefs where user_id = ${userId}`;
	await sql`delete from goals where user_id = ${userId}`;
	await sql`delete from analytics_events where user_id = ${userId}`;
	await sql`delete from rate_limits where user_id = ${userId}`;
	await sql`delete from subscriptions where user_id = ${userId}`;
	await sql`delete from profiles where user_id = ${userId}`;
}
async function wipeAuthIdentity(sql, userId) {
	const email = (await sql`select email from "user" where id = ${userId}`)[0]?.email;
	if (email) await sql`delete from "verification" where identifier = ${email}`;
	await sql`delete from "session" where "userId" = ${userId}`;
	await sql`delete from "account" where "userId" = ${userId}`;
	await sql`delete from "user" where id = ${userId}`;
}
function num$1(value) {
	const parsed = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5e3) return null;
	return Math.round(parsed * 10) / 10;
}
function cleanName(value) {
	let text = "";
	for (const char of String(value ?? "")) {
		const code = char.codePointAt(0) ?? 0;
		text += code < 32 || code === 127 ? " " : char;
	}
	return text.replace(/\s+/g, " ").trim().slice(0, 80);
}
function normalizeOffProduct(body) {
	const root = body;
	if (!root || root.status !== 1 || !root.product) return { error: "Produto não encontrado." };
	const nutriments = root.product.nutriments ?? {};
	const per100 = {
		calories: num$1(nutriments["energy-kcal_100g"]),
		protein: num$1(nutriments.proteins_100g),
		carbohydrates: num$1(nutriments.carbohydrates_100g),
		fat: num$1(nutriments.fat_100g),
		fiber: num$1(nutriments.fiber_100g)
	};
	const perServing = {
		calories: num$1(nutriments["energy-kcal_serving"]),
		protein: num$1(nutriments.proteins_serving),
		carbohydrates: num$1(nutriments.carbohydrates_serving),
		fat: num$1(nutriments.fat_serving),
		fiber: num$1(nutriments.fiber_serving)
	};
	const has100 = per100.calories != null;
	const servingQty = num$1(root.product.serving_quantity);
	const quantity = servingQty && servingQty > 0 && servingQty <= 2e3 ? servingQty : 100;
	const factor = quantity / 100;
	const chosen = (has100 ? {
		calories: per100.calories == null ? null : Math.round(per100.calories * factor),
		protein: per100.protein == null ? null : Math.round(per100.protein * factor * 10) / 10,
		carbohydrates: per100.carbohydrates == null ? null : Math.round(per100.carbohydrates * factor * 10) / 10,
		fat: per100.fat == null ? null : Math.round(per100.fat * factor * 10) / 10,
		fiber: per100.fiber == null ? null : Math.round(per100.fiber * factor * 10) / 10
	} : null) ?? (perServing.calories != null ? perServing : null);
	const filled = [
		chosen?.calories,
		chosen?.protein,
		chosen?.carbohydrates,
		chosen?.fat
	].filter((value) => value != null).length;
	const completeness = !chosen || chosen.calories == null ? "unavailable" : filled >= 4 ? "complete" : "partial";
	const name = cleanName(root.product.product_name_pt || root.product.product_name) || "Produto sem nome";
	const note = completeness === "complete" ? "Dados completos. Fonte: Open Food Facts. Confira a porção." : completeness === "partial" ? "Dados parciais. Fonte: Open Food Facts. Alguns nutrientes não vieram no rótulo." : "Produto encontrado, mas os dados nutricionais não estão disponíveis na base.";
	return {
		name,
		quantity,
		unit: "g",
		per100: has100 ? per100 : null,
		perServing: perServing.calories != null ? perServing : null,
		calories: chosen?.calories ?? null,
		protein: chosen?.protein ?? null,
		carbohydrates: chosen?.carbohydrates ?? null,
		fat: chosen?.fat ?? null,
		fiber: chosen?.fiber ?? null,
		completeness,
		note
	};
}
function avg(values) {
	if (values.length === 0) return null;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function weightTrend(points) {
	const ordered = [...points].filter((point) => Number.isFinite(point.kg)).sort((a, b) => a.day.localeCompare(b.day));
	if (ordered.length < 4) return {
		status: "insufficient",
		points: ordered.length,
		deltaKg: null,
		narrative: "Dados insuficientes para ler tendência de peso."
	};
	const mid = Math.floor(ordered.length / 2);
	const first = avg(ordered.slice(0, mid).map((point) => point.kg)) ?? 0;
	const second = avg(ordered.slice(mid).map((point) => point.kg)) ?? 0;
	const delta = round1(second - first);
	if (Math.abs(delta) < .4) return {
		status: "stable",
		points: ordered.length,
		deltaKg: delta,
		narrative: "A variação de peso nesta janela é pequena. Não dá para tratar isso como uma mudança."
	};
	return {
		status: delta > 0 ? "up" : "down",
		points: ordered.length,
		deltaKg: delta,
		narrative: `Foi observada uma variação média de ${delta > 0 ? "+" : ""}${String(delta).replace(".", ",")} kg entre o início e o fim da janela. Não é possível determinar causalidade apenas pelos registros.`
	};
}
function sampleNote(recordedDays, span) {
	if (recordedDays === 0) return "Ainda não há registros nesta janela.";
	if (span <= 1 || recordedDays < 2) return "Dados insuficientes para identificar tendência.";
	if (span < 30) return "Padrão preliminar. Não é possível determinar causalidade apenas pelos registros.";
	return "Tendência mais consistente. Não é possível determinar causalidade apenas pelos registros.";
}
function getDailySummary(input) {
	const completeness = input.meals === 0 ? "Sem refeição registrada neste dia." : input.incomplete ? "Registro parcial: algum item ficou sem dado nutricional." : "Registro do dia com os itens que você confirmou.";
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
		completeness
	};
}
function detectPatterns(input) {
	const patterns = [];
	const suggestions = [];
	const recordedDays = input.recorded.length;
	const proteinGoal = input.qualitative ? null : input.goals?.protein;
	const fiberGoal = input.qualitative ? null : input.goals?.fiber;
	if (recordedDays >= 4 && proteinGoal && proteinGoal > 0) {
		const near = input.recorded.filter((day) => day.protein >= proteinGoal * .85).length;
		if (input.recorded.filter((day) => day.protein < proteinGoal * .7).length >= Math.ceil(recordedDays * .6)) {
			patterns.push("Foi observado que a proteína ficou abaixo da referência em vários dias com registro.");
			suggestions.push("Incluir uma fonte de proteína em uma refeição do dia.");
		} else if (near >= 4) patterns.push(`Os registros mostram proteína próxima da referência em ${near} dias.`);
	}
	if (recordedDays >= 4 && fiberGoal && fiberGoal > 0) {
		if (input.recorded.filter((day) => day.fiber < fiberGoal * .6).length >= Math.ceil(recordedDays * .6)) {
			patterns.push("Parece ocorrer pouca fibra nos dias registrados.");
			suggestions.push("Incluir uma fruta ou leguminosa em uma refeição.");
		}
	}
	const waterGoal = input.goals?.waterMl ?? 0;
	if (input.span >= 7 && waterGoal > 0) {
		const covered = input.waterByDay.filter((day) => day.ml >= waterGoal * .6).length;
		const any = input.waterByDay.filter((day) => day.ml > 0).length;
		if (covered <= Math.floor(input.span / 3)) {
			patterns.push("A hidratação registrada parece irregular nesta janela.");
			suggestions.push("Beber um copo de água pela manhã.");
		} else if (any >= 5) patterns.push("Nos últimos dias, a ingestão de água ficou mais consistente.");
	}
	if (input.span >= 7 && recordedDays <= 2) {
		patterns.push("O registro ficou irregular. Dias em branco não são tratados como zero.");
		suggestions.push("Registrar o almoço nos dias em que conseguir.");
	} else if (recordedDays >= 5 && input.span >= 7) patterns.push(`Você registrou refeições em ${recordedDays} dos últimos ${input.span} dias.`);
	if (input.habitChecks.filter((check) => check.done).length >= 5) patterns.push("Há aderência visível aos hábitos que você marcou.");
	if (input.weight.status !== "insufficient" && input.span >= 7) patterns.push(input.weight.narrative);
	if (suggestions.length === 0 && recordedDays > 0) suggestions.push("Registrar uma refeição do dia, se fizer sentido para você.");
	return {
		patterns,
		suggestions
	};
}
function summarizeWindow(input) {
	const recorded = input.mealsByDay.filter((day) => day.meals > 0);
	const recordedDays = recorded.length;
	const mealCount = recorded.reduce((sum, day) => sum + day.meals, 0);
	const mean = (pick) => {
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
		weight
	});
	const consistency = recordedDays === 0 ? "Nenhum dia com refeição nesta janela." : `Refeições em ${recordedDays} de ${input.span} dias. A média usa só os dias com registro.`;
	const lines = [
		consistency,
		note,
		...patterns.slice(0, 3)
	];
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
		lines
	};
}
var api_exports = /* @__PURE__ */ __exportAll({
	acceptMicroHabit_createServerFn_handler: () => acceptMicroHabit_createServerFn_handler,
	addMemory_createServerFn_handler: () => addMemory_createServerFn_handler,
	addWater_createServerFn_handler: () => addWater_createServerFn_handler,
	analyzePhoto_createServerFn_handler: () => analyzePhoto_createServerFn_handler,
	analyzeText_createServerFn_handler: () => analyzeText_createServerFn_handler,
	askInsight_createServerFn_handler: () => askInsight_createServerFn_handler,
	deleteAccountData_createServerFn_handler: () => deleteAccountData_createServerFn_handler,
	deleteAccount_createServerFn_handler: () => deleteAccount_createServerFn_handler,
	deleteHistory_createServerFn_handler: () => deleteHistory_createServerFn_handler,
	deleteMeal_createServerFn_handler: () => deleteMeal_createServerFn_handler,
	deleteMemory_createServerFn_handler: () => deleteMemory_createServerFn_handler,
	duplicateMeal_createServerFn_handler: () => duplicateMeal_createServerFn_handler,
	exportData_createServerFn_handler: () => exportData_createServerFn_handler,
	generateWeeklyCoach_createServerFn_handler: () => generateWeeklyCoach_createServerFn_handler,
	getHome_createServerFn_handler: () => getHome_createServerFn_handler,
	getProgress_createServerFn_handler: () => getProgress_createServerFn_handler,
	listChat_createServerFn_handler: () => listChat_createServerFn_handler,
	lookupBarcode_createServerFn_handler: () => lookupBarcode_createServerFn_handler,
	saveGoals_createServerFn_handler: () => saveGoals_createServerFn_handler,
	saveHabits_createServerFn_handler: () => saveHabits_createServerFn_handler,
	saveMeal_createServerFn_handler: () => saveMeal_createServerFn_handler,
	saveProfile_createServerFn_handler: () => saveProfile_createServerFn_handler,
	saveWeight_createServerFn_handler: () => saveWeight_createServerFn_handler,
	sendChat_createServerFn_handler: () => sendChat_createServerFn_handler,
	setNotifications_createServerFn_handler: () => setNotifications_createServerFn_handler,
	toggleCheck_createServerFn_handler: () => toggleCheck_createServerFn_handler,
	track_createServerFn_handler: () => track_createServerFn_handler
});
var FAIL = "Não consegui concluir isso agora. Tente de novo em instantes.";
function dayOf(value) {
	return parseDay(value);
}
function num(value) {
	if (value == null || value === "") return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}
function asBool(value) {
	return value === true || value === "t" || value === "true" || value === 1;
}
function plainRow(row) {
	const out = {};
	for (const [key, value] of Object.entries(row)) if (value == null) out[key] = null;
	else if (value instanceof Date) out[key] = value.toISOString();
	else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") out[key] = value;
	else out[key] = String(value);
	return out;
}
function iso(value) {
	if (value instanceof Date) return value.toISOString();
	return String(value ?? "");
}
async function quiet(fn) {
	try {
		return await fn();
	} catch (error) {
		if (error instanceof Error && error.message && error.message.length < 180 && !/sql|postgres|duplicate/i.test(error.message)) return {
			ok: false,
			error: error.message
		};
		console.error(JSON.stringify({ event: "calu_request_failed" }));
		return {
			ok: false,
			error: FAIL
		};
	}
}
function mapProfile(row) {
	const sex = row.sex === "feminino" || row.sex === "masculino" ? row.sex : "nao_informar";
	const goal = GOALS.some((g) => g.id === row.goal) ? row.goal : "acompanhar";
	const activity = ACTIVITIES.some((a) => a.id === row.activity) ? row.activity : "leve";
	const diet = DIETS.some((d) => d.id === row.diet) ? row.diet : "livre";
	return {
		name: row.name,
		age: num(row.age),
		sex,
		heightCm: num(row.height_cm),
		weightKg: num(row.weight_kg),
		goal,
		activity,
		diet,
		dietNote: row.diet_note ?? "",
		restrictions: row.restrictions ?? "",
		plan: row.plan === "premium" ? "premium" : "free",
		consentAt: row.consent_at ? iso(row.consent_at) : null,
		timezone: row.timezone && isValidTimeZone(row.timezone) ? row.timezone : "America/Sao_Paulo",
		consentVersion: row.consent_version ?? null,
		termsVersion: row.terms_version ?? null,
		privacyVersion: row.privacy_version ?? null
	};
}
function mapGoals(row) {
	return {
		calories: Math.round(Number(row.calories)),
		protein: Number(row.protein),
		carbohydrates: Number(row.carbohydrates),
		fat: Number(row.fat),
		fiber: Number(row.fiber),
		waterMl: Math.round(Number(row.water_ml)),
		isEstimate: asBool(row.is_estimate),
		qualitative: asBool(row.qualitative),
		source: row.source === "USER_DEFINED" || row.source === "QUALITATIVE" ? row.source : "AI_ESTIMATE"
	};
}
function mapFood(row) {
	return {
		id: String(row.id),
		name: String(row.name),
		quantity: Number(row.quantity),
		unit: String(row.unit),
		calories: num(row.calories),
		protein: num(row.protein),
		carbohydrates: num(row.carbohydrates),
		fat: num(row.fat),
		fiber: num(row.fiber),
		confidence: num(row.confidence),
		source: [
			"ai",
			"taco",
			"user",
			"barcode"
		].includes(String(row.source)) ? String(row.source) : "user",
		dataStatus: [
			"estimate",
			"reference",
			"unavailable"
		].includes(String(row.data_status)) ? String(row.data_status) : "unavailable",
		baseQuantity: Number(row.base_quantity ?? row.quantity),
		baseCalories: num(row.base_calories),
		baseProtein: num(row.base_protein),
		baseCarbohydrates: num(row.base_carbohydrates),
		baseFat: num(row.base_fat),
		baseFiber: num(row.base_fiber),
		nutritionSource: [
			"TACO",
			"OPEN_FOOD_FACTS",
			"USER_CONFIRMED",
			"AI_ESTIMATE"
		].includes(String(row.nutrition_source)) ? String(row.nutrition_source) : void 0,
		identificationConfidence: num(row.identification_confidence),
		portionConfidence: num(row.portion_confidence),
		nutritionConfidence: num(row.nutrition_confidence)
	};
}
async function loadMeals(sql, userId, day) {
	const meals = await sql`
    select id, day, meal_type, eaten_at, source, note, uncertainties, insight,
           calories, protein, carbohydrates, fat, fiber, incomplete
    from meals
    where user_id = ${userId} and day = ${day}
    order by eaten_at asc
  `;
	if (meals.length === 0) return [];
	const foods = await sql`
    select f.*
    from food_items f
    join meals m on m.id = f.meal_id and m.user_id = f.user_id
    where f.user_id = ${userId} and m.day = ${day}
    order by f.position asc
  `;
	const byMeal = /* @__PURE__ */ new Map();
	for (const food of foods) {
		const mealId = String(food.meal_id);
		const list = byMeal.get(mealId) ?? [];
		list.push(mapFood(food));
		byMeal.set(mealId, list);
	}
	return meals.map((meal) => {
		const type = MEAL_TYPES.some((m) => m.id === meal.meal_type) ? meal.meal_type : "snack";
		let uncertainties = [];
		try {
			const parsed = JSON.parse(String(meal.uncertainties ?? "[]"));
			if (Array.isArray(parsed)) uncertainties = parsed.map((item) => String(item)).slice(0, 8);
		} catch {
			uncertainties = [];
		}
		return {
			id: String(meal.id),
			day: String(meal.day),
			mealType: type,
			eatenAt: iso(meal.eaten_at),
			source: String(meal.source),
			note: String(meal.note ?? ""),
			uncertainties,
			insight: String(meal.insight ?? ""),
			calories: Number(meal.calories ?? 0),
			protein: Number(meal.protein ?? 0),
			carbohydrates: Number(meal.carbohydrates ?? 0),
			fat: Number(meal.fat ?? 0),
			fiber: Number(meal.fiber ?? 0),
			incomplete: asBool(meal.incomplete),
			foods: byMeal.get(String(meal.id)) ?? []
		};
	});
}
function parseFoods(input) {
	if (!Array.isArray(input) || input.length < 1 || input.length > 20) throw new Error("Inclua pelo menos um alimento.");
	return input.map((item, index) => {
		const food = item;
		const name = String(food.name ?? "").trim();
		if (name.length < 1) throw new Error("Todo alimento precisa de um nome.");
		const unit = UNITS.includes(food.unit) ? String(food.unit) : "g";
		const quantity = num(food.quantity);
		if (quantity == null || quantity <= 0 || quantity > 1e4) throw new Error("Quantidade inválida.");
		const rawId = String(food.id ?? "");
		const id = /^[0-9a-f-]{16,40}$/i.test(rawId) ? rawId : crypto.randomUUID();
		const draft = makeFood({
			id,
			name,
			quantity,
			unit,
			calories: num(food.calories) == null ? null : Math.round(num(food.calories)),
			protein: num(food.protein),
			carbohydrates: num(food.carbohydrates),
			fat: num(food.fat),
			fiber: num(food.fiber),
			confidence: num(food.confidence),
			source: [
				"ai",
				"taco",
				"user",
				"barcode"
			].includes(String(food.source)) ? String(food.source) : "user",
			dataStatus: [
				"estimate",
				"reference",
				"unavailable"
			].includes(String(food.dataStatus)) ? String(food.dataStatus) : "unavailable"
		});
		draft.baseQuantity = num(food.baseQuantity) && num(food.baseQuantity) > 0 ? num(food.baseQuantity) : draft.quantity;
		draft.baseCalories = num(food.baseCalories);
		draft.baseProtein = num(food.baseProtein);
		draft.baseCarbohydrates = num(food.baseCarbohydrates);
		draft.baseFat = num(food.baseFat);
		draft.baseFiber = num(food.baseFiber);
		draft.nutritionSource = [
			"TACO",
			"OPEN_FOOD_FACTS",
			"USER_CONFIRMED",
			"AI_ESTIMATE"
		].includes(String(food.nutritionSource)) ? food.nutritionSource : food.source === "taco" ? "TACO" : food.source === "barcode" ? "OPEN_FOOD_FACTS" : food.source === "user" ? "USER_CONFIRMED" : "AI_ESTIMATE";
		draft.identificationConfidence = num(food.identificationConfidence);
		draft.portionConfidence = num(food.portionConfidence);
		draft.nutritionConfidence = num(food.nutritionConfidence);
		draft.review = food.review === "high" || food.review === "medium" || food.review === "low" ? food.review : void 0;
		return withQuantity(draft, draft.quantity);
	});
}
async function writeFoods(sql, userId, mealId, foods) {
	await sql`delete from food_items where meal_id = ${mealId} and user_id = ${userId}`;
	for (let i = 0; i < foods.length; i++) {
		const food = foods[i];
		await sql`
      insert into food_items (
        id, meal_id, user_id, name, quantity, unit, calories, protein, carbohydrates, fat, fiber,
        confidence, source, data_status, base_quantity, base_calories, base_protein, base_carbohydrates,
        base_fat, base_fiber, nutrition_source, identification_confidence, portion_confidence,
        nutrition_confidence, position, updated_at
      ) values (
        ${(await sql`select id from food_items where id = ${food.id} limit 1`)[0] ? crypto.randomUUID() : food.id}, ${mealId}, ${userId}, ${food.name}, ${food.quantity}, ${food.unit},
        ${food.calories}, ${food.protein}, ${food.carbohydrates}, ${food.fat}, ${food.fiber},
        ${food.confidence}, ${food.source}, ${food.dataStatus}, ${food.baseQuantity}, ${food.baseCalories},
        ${food.baseProtein}, ${food.baseCarbohydrates}, ${food.baseFat}, ${food.baseFiber},
        ${food.nutritionSource ?? "AI_ESTIMATE"}, ${food.identificationConfidence ?? null},
        ${food.portionConfidence ?? null}, ${food.nutritionConfidence ?? null}, ${i}, now()
      )
    `;
	}
}
function parseProfile(input) {
	const body = input ?? {};
	const name = String(body.name ?? "").trim();
	if (name.length < 2 || name.length > 60) throw new Error("Informe como quer ser chamado.");
	const ageRaw = body.age === "" || body.age == null ? null : Number(body.age);
	if (ageRaw != null && (!Number.isInteger(ageRaw) || ageRaw < 13 || ageRaw > 120)) throw new Error("Idade entre 13 e 120, ou deixe em branco.");
	const sex = body.sex === "feminino" || body.sex === "masculino" ? body.sex : "nao_informar";
	const height = body.heightCm === "" || body.heightCm == null ? null : Number(body.heightCm);
	const weight = body.weightKg === "" || body.weightKg == null ? null : Number(body.weightKg);
	if (height != null && (height < 120 || height > 230)) throw new Error("Altura fora da faixa esperada.");
	if (weight != null && (weight < 30 || weight > 300)) throw new Error("Peso fora da faixa esperada.");
	return {
		name,
		age: ageRaw,
		sex,
		heightCm: height,
		weightKg: weight,
		goal: GOALS.some((g) => g.id === body.goal) ? body.goal : "acompanhar",
		activity: ACTIVITIES.some((a) => a.id === body.activity) ? body.activity : "leve",
		diet: DIETS.some((d) => d.id === body.diet) ? body.diet : "livre",
		dietNote: String(body.dietNote ?? "").trim().slice(0, 160),
		restrictions: String(body.restrictions ?? "").trim().slice(0, 240),
		consent: body.consent === true,
		recalculate: body.recalculate === true,
		timezone: isValidTimeZone(String(body.timezone ?? "")) ? String(body.timezone) : "America/Sao_Paulo"
	};
}
async function trackEvent(sql, userId, name) {
	if (!ANALYTICS_EVENTS.includes(name)) return;
	await sql`insert into analytics_events (id, user_id, name) values (${crypto.randomUUID()}, ${userId}, ${name})`;
}
var track_createServerFn_handler = createServerRpc({
	id: "c55390699d82cd3ab2d04eac7446cca28b70c1c3fff85836dd90f785bdce943e",
	name: "track",
	filename: "src/lib/calu/api.ts"
}, (opts) => track.__executeServer(opts));
var track = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((name) => String(name ?? "")).handler(track_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		await trackEvent(await getSql(), context.userId, data);
		return {
			ok: true,
			data: { saved: true }
		};
	});
});
var getHome_createServerFn_handler = createServerRpc({
	id: "949850fd6aceff9a9274e572271e1fb5f836c09c6923b27c1471547f990d4380",
	name: "getHome",
	filename: "src/lib/calu/api.ts"
}, (opts) => getHome.__executeServer(opts));
var getHome = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({ day: dayOf(input?.day) })).handler(getHome_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		const sql = await getSql();
		const uid = context.userId;
		const profiles = await sql`select * from profiles where user_id = ${uid}`;
		const profile = profiles[0] ? mapProfile(profiles[0]) : null;
		const goalRows = await sql`select * from goals where user_id = ${uid}`;
		const goals = goalRows[0] ? mapGoals(goalRows[0]) : null;
		const meals = await loadMeals(sql, uid, data.day);
		const waterRows = await sql`
        select coalesce(sum(amount_ml), 0)::float as total from water_logs
        where user_id = ${uid} and day = ${data.day}
      `;
		const habitRows = await sql`select * from habits where user_id = ${uid}`;
		const checks = await sql`
        select habit, done from habit_checks where user_id = ${uid} and day = ${data.day}
      `;
		const memory = await sql`
        select id, fact from ai_memory where user_id = ${uid} order by created_at desc limit 30
      `;
		const usageRows = await sql`
        select image_count, text_count, chat_count from ai_usage where user_id = ${uid} and day = ${await quotaDay(sql, uid)}
      `;
		const prefs = await sql`select enabled from notification_prefs where user_id = ${uid}`;
		const usage = usageRows[0] ?? {
			image_count: 0,
			text_count: 0,
			chat_count: 0
		};
		const plan = await effectivePlan(sql, uid);
		if (profile) profile.plan = plan;
		const weekStart = shiftDayKey(data.day, -6);
		const weekMeals = await sql`
        select day, count(*)::float as meals,
          coalesce(sum(calories), 0)::float as calories,
          coalesce(sum(protein), 0)::float as protein,
          coalesce(sum(carbohydrates), 0)::float as carbohydrates,
          coalesce(sum(fat), 0)::float as fat,
          coalesce(sum(fiber), 0)::float as fiber
        from meals
        where user_id = ${uid} and day >= ${weekStart} and day <= ${data.day}
        group by day
      `;
		const weekWater = await sql`
        select day, coalesce(sum(amount_ml), 0)::float as ml from water_logs
        where user_id = ${uid} and day >= ${weekStart} and day <= ${data.day}
        group by day
      `;
		const weekWeights = await sql`
        select day, weight_kg as kg from weight_logs
        where user_id = ${uid} and day >= ${weekStart} and day <= ${data.day}
        order by day asc
      `;
		const weekChecks = await sql`
        select day, done from habit_checks where user_id = ${uid} and day >= ${weekStart} and day <= ${data.day}
      `;
		const qualitative = Boolean(goals?.qualitative || profile?.age != null && profile.age < 18);
		const week = summarizeWindow({
			span: 7,
			mealsByDay: weekMeals.map((row) => ({
				day: String(row.day),
				meals: Number(row.meals),
				calories: Number(row.calories),
				protein: Number(row.protein),
				carbohydrates: Number(row.carbohydrates),
				fat: Number(row.fat),
				fiber: Number(row.fiber)
			})),
			waterByDay: weekWater.map((row) => ({
				day: row.day,
				ml: Number(row.ml)
			})),
			weights: weekWeights.map((row) => ({
				day: row.day,
				kg: Number(row.kg)
			})),
			habitChecks: weekChecks.map((row) => ({
				day: String(row.day),
				done: asBool(row.done)
			})),
			goals: goals ? {
				protein: goals.protein,
				fiber: goals.fiber,
				waterMl: goals.waterMl
			} : null,
			qualitative
		});
		const microHabits = await sql`
        select id, label from micro_habits where user_id = ${uid} and active = true order by created_at desc limit 12
      `;
		const weightToday = await sql`
        select weight_kg as kg from weight_logs where user_id = ${uid} and day = ${data.day} order by updated_at desc limit 1
      `;
		const habitsTotal = (habitRows[0] ? [
			habitRows[0].water,
			habitRows[0].produce,
			habitRows[0].meals,
			habitRows[0].activity,
			habitRows[0].sleep
		] : [
			true,
			false,
			true,
			false,
			false
		]).filter((flag) => asBool(flag)).length + microHabits.length;
		const daily = getDailySummary({
			meals: meals.length,
			calories: meals.reduce((sum, meal) => sum + Number(meal.calories ?? 0), 0),
			protein: meals.reduce((sum, meal) => sum + Number(meal.protein ?? 0), 0),
			carbohydrates: meals.reduce((sum, meal) => sum + Number(meal.carbohydrates ?? 0), 0),
			fat: meals.reduce((sum, meal) => sum + Number(meal.fat ?? 0), 0),
			fiber: meals.reduce((sum, meal) => sum + Number(meal.fiber ?? 0), 0),
			waterMl: Math.round(Number(waterRows[0]?.total ?? 0)),
			weightKg: weightToday[0] ? Number(weightToday[0].kg) : null,
			habitsDone: checks.filter((check) => asBool(check.done)).length,
			habitsTotal,
			incomplete: meals.some((meal) => asBool(meal.incomplete))
		});
		return {
			ok: true,
			data: {
				profile,
				goals,
				meals,
				waterMl: Math.round(Number(waterRows[0]?.total ?? 0)),
				habits: {
					water: habitRows[0] ? asBool(habitRows[0].water) : true,
					produce: habitRows[0] ? asBool(habitRows[0].produce) : false,
					meals: habitRows[0] ? asBool(habitRows[0].meals) : true,
					activity: habitRows[0] ? asBool(habitRows[0].activity) : false,
					sleep: habitRows[0] ? asBool(habitRows[0].sleep) : false
				},
				checks: checks.map((c) => ({
					habit: c.habit,
					done: asBool(c.done)
				})),
				memory,
				notifications: prefs[0] ? asBool(prefs[0].enabled) : false,
				usage: {
					image: Number(usage.image_count ?? 0),
					text: Number(usage.text_count ?? 0),
					chat: Number(usage.chat_count ?? 0),
					limits: AI_LIMITS[plan]
				},
				week: {
					lines: week.lines,
					recordedDays: week.recordedDays,
					sampleNote: week.sampleNote
				},
				microHabits,
				daily
			}
		};
	});
});
var saveProfile_createServerFn_handler = createServerRpc({
	id: "ef04d8fd72b5e6a7436e9e10e9f0c05419ea544c3ba26da156243927c89c3b44",
	name: "saveProfile",
	filename: "src/lib/calu/api.ts"
}, (opts) => saveProfile.__executeServer(opts));
var saveProfile = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => parseProfile(input)).handler(saveProfile_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		const sql = await getSql();
		const uid = context.userId;
		const existing = await sql`select user_id from profiles where user_id = ${uid}`;
		if (!existing[0] && !data.consent) return {
			ok: false,
			error: "É preciso aceitar a política e os termos para criar o perfil."
		};
		return {
			ok: true,
			data: { profile: await sql.transaction(async (tx) => {
				if (existing[0]) await tx`
            update profiles set
              name = ${data.name}, age = ${data.age}, sex = ${data.sex}, height_cm = ${data.heightCm},
              weight_kg = ${data.weightKg}, goal = ${data.goal}, activity = ${data.activity}, diet = ${data.diet},
              diet_note = ${data.dietNote}, restrictions = ${data.restrictions}, timezone = ${data.timezone},
              updated_at = now()
            where user_id = ${uid}
          `;
				else {
					await tx`
            insert into profiles (
              user_id, name, age, sex, height_cm, weight_kg, goal, activity, diet, diet_note, restrictions,
              timezone, consent_at, consent_version, terms_version, privacy_version
            ) values (
              ${uid}, ${data.name}, ${data.age}, ${data.sex}, ${data.heightCm}, ${data.weightKg},
              ${data.goal}, ${data.activity}, ${data.diet}, ${data.dietNote}, ${data.restrictions},
              ${data.timezone}, now(), ${LEGAL_VERSIONS.consent}, ${LEGAL_VERSIONS.terms}, ${LEGAL_VERSIONS.privacy}
            )
          `;
					await trackEvent(tx, uid, "onboarding_completed");
				}
				if (!(await tx`select user_id from goals where user_id = ${uid}`)[0] || data.recalculate) {
					const estimated = estimateGoals(data);
					const source = estimated.qualitative ? "QUALITATIVE" : "AI_ESTIMATE";
					await tx`
            insert into goals (
              user_id, calories, protein, carbohydrates, fat, fiber, water_ml, is_estimate, source, qualitative, updated_at
            ) values (
              ${uid}, ${estimated.targets.calories}, ${estimated.targets.protein}, ${estimated.targets.carbohydrates},
              ${estimated.targets.fat}, ${estimated.targets.fiber}, ${estimated.targets.waterMl}, true,
              ${source}, ${estimated.qualitative}, now()
            )
            on conflict (user_id) do update set
              calories = excluded.calories,
              protein = excluded.protein,
              carbohydrates = excluded.carbohydrates,
              fat = excluded.fat,
              fiber = excluded.fiber,
              water_ml = excluded.water_ml,
              is_estimate = true,
              source = excluded.source,
              qualitative = excluded.qualitative,
              updated_at = now()
          `;
				}
				return mapProfile((await tx`select * from profiles where user_id = ${uid}`)[0]);
			}) }
		};
	});
});
var saveGoals_createServerFn_handler = createServerRpc({
	id: "960780eaed2bc7aa6821f6a1cb8025a2c74351e3af8043d32b54ccdf3d501967",
	name: "saveGoals",
	filename: "src/lib/calu/api.ts"
}, (opts) => saveGoals.__executeServer(opts));
var saveGoals = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const body = input ?? {};
	const calories = Number(body.calories);
	const protein = Number(body.protein);
	const carbohydrates = Number(body.carbohydrates);
	const fat = Number(body.fat);
	const fiber = Number(body.fiber);
	const waterMl = Number(body.waterMl);
	if (calories < 1500) throw new Error("Metas abaixo de 1.500 kcal não são aceitas aqui. Não sugerimos ingestão muito baixa.");
	if (calories > 6e3 || protein < 20 || protein > 400 || carbohydrates < 0 || carbohydrates > 900) throw new Error("Revise os números da meta.");
	if (fat < 15 || fat > 300 || fiber < 0 || fiber > 120 || waterMl < 500 || waterMl > 6e3) throw new Error("Revise os números da meta.");
	return {
		calories,
		protein,
		carbohydrates,
		fat,
		fiber,
		waterMl
	};
}).handler(saveGoals_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		const sql = await getSql();
		const uid = context.userId;
		if (await isMinorUser(sql, uid)) return {
			ok: false,
			error: "Para menores de 18 anos não definimos meta calórica. O acompanhamento fica no registro, na água e nos hábitos."
		};
		await sql.transaction(async (tx) => {
			await tx`
          insert into goals (
            user_id, calories, protein, carbohydrates, fat, fiber, water_ml, is_estimate, source, qualitative, updated_at
          ) values (
            ${uid}, ${Math.round(data.calories)}, ${data.protein}, ${data.carbohydrates}, ${data.fat},
            ${data.fiber}, ${Math.round(data.waterMl)}, false, ${"USER_DEFINED"}, false, now()
          )
          on conflict (user_id) do update set
            calories = excluded.calories, protein = excluded.protein, carbohydrates = excluded.carbohydrates,
            fat = excluded.fat, fiber = excluded.fiber, water_ml = excluded.water_ml,
            is_estimate = false, source = 'USER_DEFINED', qualitative = false, updated_at = now()
        `;
			await trackEvent(tx, uid, "goal_changed");
		});
		return {
			ok: true,
			data: { saved: true }
		};
	});
});
function parseMeal(input) {
	const body = input ?? {};
	const id = String(body.id ?? "");
	if (!/^[0-9a-f-]{16,40}$/i.test(id)) throw new Error("Registro inválido.");
	const mealType = MEAL_TYPES.some((m) => m.id === body.mealType) ? body.mealType : "snack";
	const source = [
		"photo",
		"text",
		"voice",
		"manual",
		"barcode",
		"search"
	].includes(String(body.source)) ? String(body.source) : "manual";
	const eatenAt = String(body.eatenAt ?? "");
	if (Number.isNaN(Date.parse(eatenAt))) throw new Error("Horário inválido.");
	const uncertainties = Array.isArray(body.uncertainties) ? body.uncertainties.map((item) => String(item).slice(0, 180)).slice(0, 6) : [];
	return {
		id,
		day: dayOf(body.day),
		mealType,
		eatenAt: new Date(eatenAt).toISOString(),
		source,
		note: String(body.note ?? "").slice(0, 280),
		uncertainties,
		insight: String(body.insight ?? "").slice(0, 320),
		foods: parseFoods(body.foods)
	};
}
var saveMeal_createServerFn_handler = createServerRpc({
	id: "dec1ea4da53b10a3e1c6dc2d17c6bf76d7b86d8010ce7366fe04d331516965e8",
	name: "saveMeal",
	filename: "src/lib/calu/api.ts"
}, (opts) => saveMeal.__executeServer(opts));
var saveMeal = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => parseMeal(input)).handler(saveMeal_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		const sql = await getSql();
		const uid = context.userId;
		const totals = sumFoods(data.foods);
		const uncertaintyJson = JSON.stringify(data.uncertainties);
		await sql.transaction(async (tx) => {
			const owned = await tx`select user_id from meals where id = ${data.id}`;
			if (owned[0] && owned[0].user_id !== uid) throw new Error("Esse registro não é seu.");
			if (owned[0]) {
				await tx`
            update meals set
              day = ${data.day}, meal_type = ${data.mealType}, eaten_at = ${data.eatenAt}, source = ${data.source},
              note = ${data.note}, uncertainties = ${uncertaintyJson}, insight = ${data.insight},
              calories = ${totals.calories}, protein = ${totals.protein}, carbohydrates = ${totals.carbohydrates},
              fat = ${totals.fat}, fiber = ${totals.fiber}, incomplete = ${totals.incomplete}, updated_at = now()
            where id = ${data.id} and user_id = ${uid}
          `;
				await trackEvent(tx, uid, "meal_edited");
			} else {
				await tx`
            insert into meals (
              id, user_id, day, meal_type, eaten_at, source, note, uncertainties, insight,
              calories, protein, carbohydrates, fat, fiber, incomplete
            ) values (
              ${data.id}, ${uid}, ${data.day}, ${data.mealType}, ${data.eatenAt}, ${data.source}, ${data.note},
              ${uncertaintyJson}, ${data.insight}, ${totals.calories}, ${totals.protein}, ${totals.carbohydrates},
              ${totals.fat}, ${totals.fiber}, ${totals.incomplete}
            )
          `;
				await trackEvent(tx, uid, "meal_created");
				if (data.source === "voice") await trackEvent(tx, uid, "voice_meal_created");
				if (data.source === "barcode") await trackEvent(tx, uid, "barcode_used");
			}
			await writeFoods(tx, uid, data.id, data.foods);
		});
		return {
			ok: true,
			data: { mealId: data.id }
		};
	});
});
var deleteMeal_createServerFn_handler = createServerRpc({
	id: "d60afee2617786c0d60773f05ff548572a644237fa9c03ae8c61be68939960d8",
	name: "deleteMeal",
	filename: "src/lib/calu/api.ts"
}, (opts) => deleteMeal.__executeServer(opts));
var deleteMeal = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => parseEntityId(id)).handler(deleteMeal_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		await (await getSql()).transaction(async (tx) => {
			if (!await findOwnedMeal(tx, context.userId, data)) return;
			await tx`delete from food_items where meal_id = ${data} and user_id = ${context.userId}`;
			await tx`delete from meals where id = ${data} and user_id = ${context.userId}`;
			await trackEvent(tx, context.userId, "meal_deleted");
		});
		return {
			ok: true,
			data: { deleted: true }
		};
	});
});
var duplicateMeal_createServerFn_handler = createServerRpc({
	id: "9ef3f457c8abde30f02b125cc4934d6d6df82b2dc016d94f2e600faa86007cf9",
	name: "duplicateMeal",
	filename: "src/lib/calu/api.ts"
}, (opts) => duplicateMeal.__executeServer(opts));
var duplicateMeal = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	id: parseEntityId(input?.id),
	day: dayOf(input?.day)
})).handler(duplicateMeal_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		const sql = await getSql();
		const uid = context.userId;
		const source = (await loadMeals(sql, uid, (await sql`select day from meals where id = ${data.id} and user_id = ${uid}`)[0]?.day ?? data.day)).find((meal) => meal.id === data.id);
		if (!source) return {
			ok: false,
			error: "Refeição não encontrada."
		};
		const id = crypto.randomUUID();
		const totals = sumFoods(source.foods);
		await sql.transaction(async (tx) => {
			await tx`
          insert into meals (
            id, user_id, day, meal_type, eaten_at, source, note, uncertainties, insight,
            calories, protein, carbohydrates, fat, fiber, incomplete
          ) values (
            ${id}, ${uid}, ${data.day}, ${source.mealType}, ${(/* @__PURE__ */ new Date()).toISOString()}, ${source.source},
            ${source.note}, ${JSON.stringify(source.uncertainties)}, ${source.insight},
            ${totals.calories}, ${totals.protein}, ${totals.carbohydrates}, ${totals.fat}, ${totals.fiber},
            ${totals.incomplete}
          )
        `;
			await writeFoods(tx, uid, id, source.foods.map((food) => ({
				...food,
				id: crypto.randomUUID()
			})));
		});
		return {
			ok: true,
			data: { mealId: id }
		};
	});
});
function hintFrom(input) {
	return String(input.hint ?? "").slice(0, 500);
}
async function guardedAi(userId, kind, action, operation, run) {
	const requestId = newRequestId();
	const started = Date.now();
	const sql = await getSql();
	const limited = await hitRateLimit(sql, userId, action);
	if (!limited.ok) return limited;
	const day = await quotaDay(sql, userId);
	const reserved = await reserveQuota(sql, userId, day, kind);
	if (!reserved.ok) return reserved;
	const minor = await isMinorUser(sql, userId);
	try {
		const result = await run(minor);
		await recordAiCall(sql, {
			userId,
			operation,
			provider: result.usage.provider,
			model: result.usage.model,
			inputTokens: result.usage.inputTokens,
			outputTokens: result.usage.outputTokens,
			success: true,
			durationMs: Date.now() - started,
			requestId
		});
		logEvent("ai_analysis_completed", {
			requestId,
			userId,
			provider: result.usage.provider,
			model: result.usage.model,
			durationMs: Date.now() - started,
			success: true,
			operation
		});
		return {
			ok: true,
			data: result.value
		};
	} catch (error) {
		await releaseQuota(sql, userId, day, kind);
		const { aiErrorMessage } = await import("./ai.server-C7hCmX39.mjs");
		await recordAiCall(sql, {
			userId,
			operation,
			provider: null,
			model: null,
			inputTokens: null,
			outputTokens: null,
			success: false,
			durationMs: Date.now() - started,
			requestId
		}).catch(() => void 0);
		logEvent("ai_analysis_failed", {
			requestId,
			userId,
			operation,
			durationMs: Date.now() - started,
			success: false
		});
		return {
			ok: false,
			error: aiErrorMessage(error)
		};
	}
}
var analyzePhoto_createServerFn_handler = createServerRpc({
	id: "3c5c7a9a46e5022fd5f2fee92ca419ecbcedd14c5fc60de70c206faf9f2e72aa",
	name: "analyzePhoto",
	filename: "src/lib/calu/api.ts"
}, (opts) => analyzePhoto.__executeServer(opts));
var analyzePhoto = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const body = input ?? {};
	return {
		image: parseImageBase64(body.imageBase64),
		hint: hintFrom(body),
		hour: Number(body.hour) || 12,
		day: dayOf(body.day)
	};
}).handler(analyzePhoto_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		const sql = await getSql();
		await trackEvent(sql, context.userId, "photo_started");
		const result = await guardedAi(context.userId, "image", "analyzePhoto", "analyzePhoto", async (minor) => {
			const { getAIProvider } = await import("./ai.server-C7hCmX39.mjs");
			const call = await getAIProvider().analyzeMealImage(data.image, data.hint, data.hour, { minor });
			return {
				value: enrichAnalysis(call.value),
				usage: call.usage
			};
		});
		if (result.ok) await trackEvent(sql, context.userId, "photo_completed");
		else await trackEvent(sql, context.userId, "photo_failed");
		if (!result.ok) return result;
		return {
			ok: true,
			data: { analysis: result.data }
		};
	});
});
var analyzeText_createServerFn_handler = createServerRpc({
	id: "31ff68b6de2671c50bced77530ec16530a1815e954ab66bc42e6c9ee3a2f8187",
	name: "analyzeText",
	filename: "src/lib/calu/api.ts"
}, (opts) => analyzeText.__executeServer(opts));
var analyzeText = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const body = input ?? {};
	const text = String(body.text ?? "").trim();
	if (text.length < 2 || text.length > 800) throw new Error("Descreva a refeição em uma frase.");
	return {
		text,
		source: body.source === "voice" ? "voice" : "text",
		hint: hintFrom(body),
		hour: Number(body.hour) || 12,
		day: dayOf(body.day)
	};
}).handler(analyzeText_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		const result = await guardedAi(context.userId, "text", "analyzeText", "analyzeText", async (minor) => {
			const { getAIProvider } = await import("./ai.server-C7hCmX39.mjs");
			const provider = getAIProvider();
			const call = data.source === "voice" ? await provider.analyzeMealVoice(data.text, data.hint, data.hour, { minor }) : await provider.analyzeMealText(data.text, data.hint, data.hour, { minor });
			return {
				value: enrichAnalysis(call.value),
				usage: call.usage
			};
		});
		if (!result.ok) return result;
		return {
			ok: true,
			data: { analysis: result.data }
		};
	});
});
var addWater_createServerFn_handler = createServerRpc({
	id: "457be820c823fbb22e98a3594b12d27b28b942789eddd5333cab7a32d2510903",
	name: "addWater",
	filename: "src/lib/calu/api.ts"
}, (opts) => addWater.__executeServer(opts));
var addWater = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const amount = Number(input?.amountMl);
	if (![
		150,
		200,
		250,
		350,
		500
	].includes(amount)) throw new Error("Quantidade de água inválida.");
	return {
		day: dayOf(input?.day),
		amountMl: amount
	};
}).handler(addWater_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		const sql = await getSql();
		await sql`
        insert into water_logs (id, user_id, day, amount_ml) values (${crypto.randomUUID()}, ${context.userId}, ${data.day}, ${data.amountMl})
      `;
		const rows = await sql`
        select coalesce(sum(amount_ml), 0)::float as total from water_logs where user_id = ${context.userId} and day = ${data.day}
      `;
		return {
			ok: true,
			data: { waterMl: Math.round(Number(rows[0]?.total ?? 0)) }
		};
	});
});
var saveWeight_createServerFn_handler = createServerRpc({
	id: "aec5c69a5f0da4881994a88fb34a6db94fc4acb48517ead9c7f57091f611525f",
	name: "saveWeight",
	filename: "src/lib/calu/api.ts"
}, (opts) => saveWeight.__executeServer(opts));
var saveWeight = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const weight = Number(input?.weightKg);
	if (!Number.isFinite(weight) || weight < 30 || weight > 300) throw new Error("Informe um peso entre 30 e 300 kg.");
	return {
		day: dayOf(input?.day),
		weightKg: Math.round(weight * 10) / 10
	};
}).handler(saveWeight_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		await (await getSql()).transaction(async (tx) => {
			const existing = await tx`
          select id from weight_logs where user_id = ${context.userId} and day = ${data.day} limit 1
        `;
			if (existing[0]) await tx`
            update weight_logs set weight_kg = ${data.weightKg}, updated_at = now()
            where id = ${existing[0].id} and user_id = ${context.userId}
          `;
			else await tx`
            insert into weight_logs (id, user_id, day, weight_kg) values (${crypto.randomUUID()}, ${context.userId}, ${data.day}, ${data.weightKg})
          `;
			await tx`update profiles set weight_kg = ${data.weightKg}, updated_at = now() where user_id = ${context.userId}`;
		});
		return {
			ok: true,
			data: { saved: true }
		};
	});
});
var getProgress_createServerFn_handler = createServerRpc({
	id: "4e7979d168c0c61a61777db323cf398ad8393c73b713ada910a84730334f4e6f",
	name: "getProgress",
	filename: "src/lib/calu/api.ts"
}, (opts) => getProgress.__executeServer(opts));
var getProgress = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const span = Number(input?.span);
	if (![
		1,
		7,
		30,
		90
	].includes(span)) throw new Error("Período inválido.");
	return {
		endDay: dayOf(input?.endDay),
		span
	};
}).handler(getProgress_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		const sql = await getSql();
		const uid = context.userId;
		const start = shiftDayKey(data.endDay, -(data.span - 1));
		const meals = await sql`
        select day,
          coalesce(sum(calories), 0)::float as calories,
          coalesce(sum(protein), 0)::float as protein,
          coalesce(sum(fiber), 0)::float as fiber,
          coalesce(sum(carbohydrates), 0)::float as carbohydrates,
          coalesce(sum(fat), 0)::float as fat,
          count(*)::float as meals
        from meals
        where user_id = ${uid} and day >= ${start} and day <= ${data.endDay}
        group by day
      `;
		const water = await sql`
        select day, sum(amount_ml)::float as ml from water_logs
        where user_id = ${uid} and day >= ${start} and day <= ${data.endDay}
        group by day
      `;
		const weights = await sql`
        select day, weight_kg from weight_logs
        where user_id = ${uid} and day >= ${start} and day <= ${data.endDay}
        order by day asc
      `;
		const checks = await sql`
        select day, done from habit_checks where user_id = ${uid} and day >= ${start} and day <= ${data.endDay}
      `;
		const goalRows = await sql`select * from goals where user_id = ${uid}`;
		const goals = goalRows[0] ? mapGoals(goalRows[0]) : null;
		const profiles = await sql`select age from profiles where user_id = ${uid}`;
		const age = Number(profiles[0]?.age);
		const longitudinal = summarizeWindow({
			span: data.span,
			mealsByDay: meals.map((row) => ({
				day: String(row.day),
				meals: Number(row.meals ?? 1),
				calories: Number(row.calories),
				protein: Number(row.protein),
				carbohydrates: Number(row.carbohydrates),
				fat: Number(row.fat),
				fiber: Number(row.fiber)
			})),
			waterByDay: water.map((row) => ({
				day: row.day,
				ml: Number(row.ml)
			})),
			weights: weights.map((row) => ({
				day: row.day,
				kg: Number(row.weight_kg)
			})),
			habitChecks: checks.map((row) => ({
				day: String(row.day),
				done: asBool(row.done)
			})),
			goals: goals ? {
				protein: goals.protein,
				fiber: goals.fiber,
				waterMl: goals.waterMl
			} : null,
			qualitative: Boolean(goals?.qualitative || Number.isFinite(age) && age < 18)
		});
		await trackEvent(sql, uid, "progress_viewed");
		if (data.span >= 7) await trackEvent(sql, uid, "weekly_summary_viewed");
		return {
			ok: true,
			data: {
				start,
				meals: meals.map((m) => ({
					day: m.day,
					calories: Number(m.calories),
					protein: Number(m.protein),
					fiber: Number(m.fiber)
				})),
				water: water.map((w) => ({
					day: w.day,
					ml: Math.round(Number(w.ml))
				})),
				weights: weights.map((w) => ({
					day: w.day,
					kg: Number(w.weight_kg)
				})),
				longitudinal
			}
		};
	});
});
var saveHabits_createServerFn_handler = createServerRpc({
	id: "a857c794d0f985709d325a7be67a932ebb00acf8264407e38dde0265c207da33",
	name: "saveHabits",
	filename: "src/lib/calu/api.ts"
}, (opts) => saveHabits.__executeServer(opts));
var saveHabits = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const body = input ?? {};
	return {
		water: body.water === true,
		produce: body.produce === true,
		meals: body.meals === true,
		activity: body.activity === true,
		sleep: body.sleep === true
	};
}).handler(saveHabits_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		await (await getSql())`
        insert into habits (user_id, water, produce, meals, activity, sleep, updated_at)
        values (${context.userId}, ${data.water}, ${data.produce}, ${data.meals}, ${data.activity}, ${data.sleep}, now())
        on conflict (user_id) do update set
          water = excluded.water, produce = excluded.produce, meals = excluded.meals,
          activity = excluded.activity, sleep = excluded.sleep, updated_at = now()
      `;
		return {
			ok: true,
			data: { saved: true }
		};
	});
});
var toggleCheck_createServerFn_handler = createServerRpc({
	id: "06348902c8c2db6aa00281fe572ac30d439785ef11474bb9f989bd9a5ca33f04",
	name: "toggleCheck",
	filename: "src/lib/calu/api.ts"
}, (opts) => toggleCheck.__executeServer(opts));
var toggleCheck = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const habit = String(input?.habit ?? "");
	if (![
		"produce",
		"activity",
		"sleep"
	].includes(habit) && !/^[0-9a-f-]{16,40}$/i.test(habit)) throw new Error("Hábito inválido.");
	return {
		day: dayOf(input?.day),
		habit,
		done: input?.done === true
	};
}).handler(toggleCheck_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		const sql = await getSql();
		if (![
			"produce",
			"activity",
			"sleep"
		].includes(data.habit)) {
			if (!(await sql`
          select id from micro_habits where id = ${data.habit} and user_id = ${context.userId} and active = true
        `)[0]) return {
				ok: false,
				error: "Hábito inválido."
			};
		}
		await sql`
        insert into habit_checks (id, user_id, day, habit, done)
        values (${crypto.randomUUID()}, ${context.userId}, ${data.day}, ${data.habit}, ${data.done})
        on conflict (user_id, day, habit) do update set done = ${data.done}
      `;
		if (data.done) await trackEvent(sql, context.userId, "habit_completed");
		return {
			ok: true,
			data: { saved: true }
		};
	});
});
var setNotifications_createServerFn_handler = createServerRpc({
	id: "d2d9636a5a2552f197994ff5c881ff9a675c438f24a58832784859c6893e76f6",
	name: "setNotifications",
	filename: "src/lib/calu/api.ts"
}, (opts) => setNotifications.__executeServer(opts));
var setNotifications = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((enabled) => enabled === true).handler(setNotifications_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		await (await getSql())`
        insert into notification_prefs (user_id, enabled, updated_at)
        values (${context.userId}, ${data}, now())
        on conflict (user_id) do update set enabled = ${data}, updated_at = now()
      `;
		return {
			ok: true,
			data: { enabled: data }
		};
	});
});
async function diaryContext(sql, userId, day) {
	const profiles = await sql`select * from profiles where user_id = ${userId}`;
	const profile = profiles[0] ? mapProfile(profiles[0]) : null;
	const goalRows = await sql`select * from goals where user_id = ${userId}`;
	const goals = goalRows[0] ? mapGoals(goalRows[0]) : null;
	const meals = await loadMeals(sql, userId, day);
	const memory = await sql`select fact from ai_memory where user_id = ${userId} order by created_at desc limit 20`;
	const totals = meals.reduce((acc, meal) => {
		acc.calories += meal.calories;
		acc.protein += meal.protein;
		return acc;
	}, {
		calories: 0,
		protein: 0
	});
	const mealLines = meals.map((meal) => `${mealLabel(meal.mealType)}: ${meal.foods.map((f) => f.name).join(", ")} (${Math.round(meal.calories)} kcal, estimativa)`);
	return [
		profile ? `Nome: ${profile.name}. Objetivo: ${profile.goal}. Dieta: ${profile.diet}. Restrições informadas: ${profile.restrictions || "nenhuma"}.` : "Sem perfil.",
		goals ? `Metas estimadas ou editadas: ${goals.calories} kcal, ${goals.protein} g proteína, ${goals.carbohydrates} g carboidrato, ${goals.fat} g gordura, ${goals.fiber} g fibra, ${goals.waterMl} ml água.` : "Sem metas.",
		`Registrado hoje: ${Math.round(totals.calories)} kcal e ${Math.round(totals.protein)} g de proteína.`,
		mealLines.length ? mealLines.join("\n") : "Nenhuma refeição registrada hoje.",
		memory.length ? `Memória confirmada pelo usuário:\n- ${memory.map((m) => m.fact).join("\n- ")}` : "Nenhuma memória salva."
	].join("\n");
}
var sendChat_createServerFn_handler = createServerRpc({
	id: "e2dedb0307ed957a23fe7af5f265c1af94527322d26de8091d5fa2884f207b83",
	name: "sendChat",
	filename: "src/lib/calu/api.ts"
}, (opts) => sendChat.__executeServer(opts));
var sendChat = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const message = String(input?.message ?? "").trim();
	if (message.length < 1 || message.length > 1500) throw new Error("Escreva uma mensagem curta.");
	return {
		message,
		day: dayOf(input?.day)
	};
}).handler(sendChat_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		const sql = await getSql();
		const uid = context.userId;
		await sql`insert into ai_messages (id, user_id, role, content) values (${crypto.randomUUID()}, ${uid}, ${"user"}, ${data.message})`;
		const blocked = safetyReply(data.message);
		const remembered = memoryCommand(data.message);
		let reply = blocked;
		if (!reply && remembered) {
			const count = await sql`select count(*)::float as n from ai_memory where user_id = ${uid}`;
			if (Number(count[0]?.n ?? 0) >= 30) reply = "Sua memória já está cheia. Apague algum item em Perfil para guardar outro.";
			else {
				await sql`insert into ai_memory (id, user_id, fact) values (${crypto.randomUUID()}, ${uid}, ${remembered})`;
				reply = "Guardei isso. Você pode ler ou apagar em Perfil, na memória. Eu só uso o que você confirmar.";
			}
		}
		if (!reply && asksMemory(data.message)) {
			const memory = await sql`select fact from ai_memory where user_id = ${uid} order by created_at desc limit 30`;
			reply = memory.length ? `Isto é o que você pediu para eu guardar:\n${memory.map((m) => `• ${m.fact}`).join("\n")}\nSe algo estiver errado, apague em Perfil.` : "Ainda não guardei preferências. Você pode dizer “lembre que…” ou escrever em Perfil.";
		}
		if (!reply) {
			const ordered = (await sql`
          select role, content from ai_messages where user_id = ${uid} order by created_at desc limit 10
        `).reverse().filter((m) => m.role === "user" || m.role === "assistant");
			await trackEvent(sql, uid, "chat_started");
			const result = await guardedAi(uid, "chat", "sendChat", "sendChat", async (minor) => {
				const { getAIProvider } = await import("./ai.server-C7hCmX39.mjs");
				const call = await getAIProvider().chat(ordered, await diaryContext(sql, uid, data.day), { minor });
				return {
					value: call.value,
					usage: call.usage
				};
			});
			reply = result.ok ? result.data : result.error;
			if (result.ok) await trackEvent(sql, uid, "chat_completed");
		}
		await sql`insert into ai_messages (id, user_id, role, content) values (${crypto.randomUUID()}, ${uid}, ${"assistant"}, ${reply})`;
		return {
			ok: true,
			data: { reply }
		};
	});
});
var listChat_createServerFn_handler = createServerRpc({
	id: "8f9fa1a5d2c2e7469da2d9e53dbc9f76437ad77017bc8c792a777cb48e08805a",
	name: "listChat",
	filename: "src/lib/calu/api.ts"
}, (opts) => listChat.__executeServer(opts));
var listChat = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const before = input && typeof input === "object" ? String(input.before ?? "") : "";
	if (before && Number.isNaN(Date.parse(before))) throw new Error("Página inválida.");
	return { before };
}).handler(listChat_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		const sql = await getSql();
		return {
			ok: true,
			data: { messages: (data.before ? await sql`
            select id, role, content, created_at from ai_messages
            where user_id = ${context.userId} and created_at < ${data.before}
            order by created_at desc limit 40
          ` : await sql`
            select id, role, content, created_at from ai_messages
            where user_id = ${context.userId}
            order by created_at desc limit 40
          `).reverse().map((row) => ({
				id: row.id,
				role: row.role,
				content: row.content,
				createdAt: iso(row.created_at)
			})) }
		};
	});
});
var deleteMemory_createServerFn_handler = createServerRpc({
	id: "4917af8ac2c61611754490b57c54d91265ff5947bcf2fcb497734e5bae64239c",
	name: "deleteMemory",
	filename: "src/lib/calu/api.ts"
}, (opts) => deleteMemory.__executeServer(opts));
var deleteMemory = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => parseEntityId(id)).handler(deleteMemory_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		await (await getSql())`delete from ai_memory where id = ${data} and user_id = ${context.userId}`;
		return {
			ok: true,
			data: { deleted: true }
		};
	});
});
var addMemory_createServerFn_handler = createServerRpc({
	id: "43917d76dcfbb027d0640d34a85935282ce01c0a70e99cf875fe496e7c41efdb",
	name: "addMemory",
	filename: "src/lib/calu/api.ts"
}, (opts) => addMemory.__executeServer(opts));
var addMemory = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((fact) => {
	const text = String(fact ?? "").trim();
	if (text.length < 3 || text.length > 240) throw new Error("Escreva um fato curto.");
	return text;
}).handler(addMemory_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		const sql = await getSql();
		const count = await sql`select count(*)::float as n from ai_memory where user_id = ${context.userId}`;
		if (Number(count[0]?.n ?? 0) >= 30) return {
			ok: false,
			error: "A memória está cheia. Apague um item antes."
		};
		const id = crypto.randomUUID();
		await sql`insert into ai_memory (id, user_id, fact) values (${id}, ${context.userId}, ${data})`;
		return {
			ok: true,
			data: { id }
		};
	});
});
var lookupBarcode_createServerFn_handler = createServerRpc({
	id: "cdd68d43665309a34e797baf86f25cc5793581f0624db4871bfbbeaaa7fa3cfe",
	name: "lookupBarcode",
	filename: "src/lib/calu/api.ts"
}, (opts) => lookupBarcode.__executeServer(opts));
var lookupBarcode = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((code) => parseBarcode(code)).handler(lookupBarcode_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		const sql = await getSql();
		const limited = await hitRateLimit(sql, context.userId, "lookupBarcode");
		if (!limited.ok) return limited;
		const cached = await sql`
        select payload, fetched_at from barcode_cache where code = ${data}
      `;
		const fresh = cached[0] && Date.now() - Date.parse(iso(cached[0].fetched_at)) < 6048e5;
		let normalized = null;
		if (fresh && cached[0]) try {
			normalized = normalizeOffProduct(JSON.parse(cached[0].payload));
		} catch {
			normalized = null;
		}
		if (!normalized || "error" in normalized) {
			let res;
			try {
				res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(data)}.json`, {
					headers: { "User-Agent": "CaluAI/1.0 (meal diary; contact via app)" },
					signal: AbortSignal.timeout(8e3)
				});
			} catch {
				return {
					ok: false,
					error: "Não consegui consultar o código agora. Tente de novo."
				};
			}
			if (res.status === 404) return {
				ok: false,
				error: "Produto não encontrado."
			};
			if (!res.ok) return {
				ok: false,
				error: "Não consegui consultar o código agora. Tente de novo."
			};
			const parsed = normalizeOffProduct(await res.json().catch(() => null));
			if ("error" in parsed) return {
				ok: false,
				error: parsed.error
			};
			normalized = parsed;
			const compact = {
				status: 1,
				product: {
					product_name: parsed.name,
					serving_quantity: parsed.quantity,
					nutriments: {
						"energy-kcal_100g": parsed.per100?.calories,
						proteins_100g: parsed.per100?.protein,
						carbohydrates_100g: parsed.per100?.carbohydrates,
						fat_100g: parsed.per100?.fat,
						fiber_100g: parsed.per100?.fiber,
						"energy-kcal_serving": parsed.perServing?.calories,
						proteins_serving: parsed.perServing?.protein,
						carbohydrates_serving: parsed.perServing?.carbohydrates,
						fat_serving: parsed.perServing?.fat,
						fiber_serving: parsed.perServing?.fiber
					}
				}
			};
			await sql`
          insert into barcode_cache (code, payload, fetched_at)
          values (${data}, ${JSON.stringify(compact)}, now())
          on conflict (code) do update set payload = excluded.payload, fetched_at = now()
        `;
		}
		if ("error" in normalized) return {
			ok: false,
			error: String(normalized.error)
		};
		await trackEvent(sql, context.userId, "barcode_used");
		return {
			ok: true,
			data: {
				name: normalized.name,
				quantity: normalized.quantity,
				unit: normalized.unit,
				calories: normalized.calories == null ? null : Math.round(normalized.calories),
				protein: normalized.protein,
				carbohydrates: normalized.carbohydrates,
				fat: normalized.fat,
				fiber: normalized.fiber,
				note: normalized.note,
				completeness: normalized.completeness,
				nutritionSource: "OPEN_FOOD_FACTS"
			}
		};
	});
});
var exportData_createServerFn_handler = createServerRpc({
	id: "6bf6c8657e27577c1da84cffdf2551317dc94d234edf56f8fe06b9c028559e8a",
	name: "exportData",
	filename: "src/lib/calu/api.ts"
}, (opts) => exportData.__executeServer(opts));
var exportData = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(() => ({})).handler(exportData_createServerFn_handler, async ({ context }) => {
	return quiet(async () => {
		const sql = await getSql();
		const uid = context.userId;
		const profile = await sql`select name, age, sex, height_cm, weight_kg, goal, activity, diet, diet_note, restrictions, plan, created_at from profiles where user_id = ${uid}`;
		const goals = await sql`select calories, protein, carbohydrates, fat, fiber, water_ml, is_estimate from goals where user_id = ${uid}`;
		const meals = await sql`select id, day, meal_type, eaten_at, source, note, calories, protein, carbohydrates, fat, fiber from meals where user_id = ${uid} order by eaten_at desc limit 2000`;
		const foods = await sql`select meal_id, name, quantity, unit, calories, protein, carbohydrates, fat, fiber, source, data_status, nutrition_source from food_items where user_id = ${uid} limit 8000`;
		const water = await sql`select day, amount_ml, created_at from water_logs where user_id = ${uid} order by created_at desc limit 4000`;
		const weight = await sql`select day, weight_kg from weight_logs where user_id = ${uid} order by day desc limit 2000`;
		const memory = await sql`select fact, created_at from ai_memory where user_id = ${uid}`;
		return {
			ok: true,
			data: {
				exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
				profile: profile.map(plainRow),
				goals: goals.map(plainRow),
				meals: meals.map(plainRow),
				foods: foods.map(plainRow),
				water: water.map(plainRow),
				weight: weight.map(plainRow),
				memory: memory.map(plainRow)
			}
		};
	});
});
var deleteHistory_createServerFn_handler = createServerRpc({
	id: "1ab172087df397cc2924de8a8862ee1a61d1ce3c8563fa141090508044932658",
	name: "deleteHistory",
	filename: "src/lib/calu/api.ts"
}, (opts) => deleteHistory.__executeServer(opts));
var deleteHistory = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(() => ({})).handler(deleteHistory_createServerFn_handler, async ({ context }) => {
	return quiet(async () => {
		const sql = await getSql();
		const uid = context.userId;
		await sql.transaction(async (tx) => {
			await tx`delete from food_items where user_id = ${uid}`;
			await tx`delete from meals where user_id = ${uid}`;
			await tx`delete from water_logs where user_id = ${uid}`;
			await tx`delete from weight_logs where user_id = ${uid}`;
			await tx`delete from habit_checks where user_id = ${uid}`;
		});
		return {
			ok: true,
			data: { deleted: true }
		};
	});
});
var deleteAccountData_createServerFn_handler = createServerRpc({
	id: "bb1063cb51e5401bfaf8536563a233b5e531757b1c9dfd622c8ea22acc316827",
	name: "deleteAccountData",
	filename: "src/lib/calu/api.ts"
}, (opts) => deleteAccountData.__executeServer(opts));
var deleteAccountData = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(() => ({})).handler(deleteAccountData_createServerFn_handler, async ({ context }) => {
	return quiet(async () => {
		const sql = await getSql();
		const uid = context.userId;
		await sql.transaction(async (tx) => {
			await wipeUserData(tx, uid);
		});
		return {
			ok: true,
			data: { deleted: true }
		};
	});
});
var deleteAccount_createServerFn_handler = createServerRpc({
	id: "8a03ac1838a7a6eef6e58d66bf12c2b8ffc9b451fa282afdb1355f755b218f74",
	name: "deleteAccount",
	filename: "src/lib/calu/api.ts"
}, (opts) => deleteAccount.__executeServer(opts));
var deleteAccount = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(() => ({})).handler(deleteAccount_createServerFn_handler, async ({ context }) => {
	return quiet(async () => {
		const sql = await getSql();
		const uid = context.userId;
		await sql.transaction(async (tx) => {
			await wipeUserData(tx, uid);
			await wipeAuthIdentity(tx, uid);
		});
		return {
			ok: true,
			data: { deleted: true }
		};
	});
});
var acceptMicroHabit_createServerFn_handler = createServerRpc({
	id: "3707df74847020797d8365173fdca26d906e2e771f8b40888a62ab56ec5cc584",
	name: "acceptMicroHabit",
	filename: "src/lib/calu/api.ts"
}, (opts) => acceptMicroHabit.__executeServer(opts));
var acceptMicroHabit = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((label) => {
	const text = String(label ?? "").trim();
	if (text.length < 3 || text.length > 120) throw new Error("Descreva um hábito curto.");
	return text;
}).handler(acceptMicroHabit_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		const sql = await getSql();
		const count = await sql`select count(*)::float as n from micro_habits where user_id = ${context.userId} and active = true`;
		if (Number(count[0]?.n ?? 0) >= 8) return {
			ok: false,
			error: "Você já tem micro-hábitos suficientes. Desligue algum antes."
		};
		const id = crypto.randomUUID();
		await sql`insert into micro_habits (id, user_id, label, active) values (${id}, ${context.userId}, ${data}, true)`;
		await trackEvent(sql, context.userId, "habit_created");
		return {
			ok: true,
			data: { id }
		};
	});
});
var generateWeeklyCoach_createServerFn_handler = createServerRpc({
	id: "361255684f2487dc76a4ef2617d25fdc742496cefd4b3e5243e51cdf66a55140",
	name: "generateWeeklyCoach",
	filename: "src/lib/calu/api.ts"
}, (opts) => generateWeeklyCoach.__executeServer(opts));
var generateWeeklyCoach = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({ day: dayOf(input?.day) })).handler(generateWeeklyCoach_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		const sql = await getSql();
		const uid = context.userId;
		const start = shiftDayKey(data.day, -6);
		const meals = await sql`
        select day, count(*)::float as meals,
          coalesce(sum(calories), 0)::float as calories,
          coalesce(sum(protein), 0)::float as protein,
          coalesce(sum(carbohydrates), 0)::float as carbohydrates,
          coalesce(sum(fat), 0)::float as fat,
          coalesce(sum(fiber), 0)::float as fiber
        from meals where user_id = ${uid} and day >= ${start} and day <= ${data.day}
        group by day
      `;
		const water = await sql`
        select day, coalesce(sum(amount_ml), 0)::float as ml from water_logs
        where user_id = ${uid} and day >= ${start} and day <= ${data.day} group by day
      `;
		const weights = await sql`
        select day, weight_kg as kg from weight_logs where user_id = ${uid} and day >= ${start} and day <= ${data.day}
      `;
		const checks = await sql`
        select day, done from habit_checks where user_id = ${uid} and day >= ${start} and day <= ${data.day}
      `;
		const goalRows = await sql`select * from goals where user_id = ${uid}`;
		const goals = goalRows[0] ? mapGoals(goalRows[0]) : null;
		const minor = await isMinorUser(sql, uid);
		const summary = summarizeWindow({
			span: 7,
			mealsByDay: meals.map((row) => ({
				day: String(row.day),
				meals: Number(row.meals),
				calories: Number(row.calories),
				protein: Number(row.protein),
				carbohydrates: Number(row.carbohydrates),
				fat: Number(row.fat),
				fiber: Number(row.fiber)
			})),
			waterByDay: water.map((row) => ({
				day: row.day,
				ml: Number(row.ml)
			})),
			weights: weights.map((row) => ({
				day: row.day,
				kg: Number(row.kg)
			})),
			habitChecks: checks.map((row) => ({
				day: String(row.day),
				done: asBool(row.done)
			})),
			goals: goals ? {
				protein: goals.protein,
				fiber: goals.fiber,
				waterMl: goals.waterMl
			} : null,
			qualitative: minor || Boolean(goals?.qualitative)
		});
		if (summary.recordedDays < 2) return {
			ok: true,
			data: {
				...fallbackCoach(summary),
				source: "records"
			}
		};
		const contextText = [
			summary.consistency,
			summary.sampleNote,
			...summary.patterns,
			summary.avgProtein != null ? `Proteína média nos dias registrados: ${summary.avgProtein} g.` : "",
			summary.avgFiber != null ? `Fibra média: ${summary.avgFiber} g.` : "",
			summary.avgWater != null ? `Água média: ${summary.avgWater} ml.` : ""
		].filter(Boolean).join("\n");
		const result = await guardedAi(uid, "text", "weeklyCoach", "weeklyCoach", async (isMinor) => {
			const { getAIProvider } = await import("./ai.server-C7hCmX39.mjs");
			const call = await getAIProvider().generateWeeklyCoach(contextText, { minor: isMinor });
			return {
				value: call.value,
				usage: call.usage
			};
		});
		const parsed = result.ok ? parseCoach(extractJson(result.data)) : null;
		if (!result.ok && /limite|Muitas tentativas/i.test(result.error)) return result;
		return {
			ok: true,
			data: {
				...parsed ?? fallbackCoach(summary),
				source: parsed ? "ai" : "records"
			}
		};
	});
});
var askInsight_createServerFn_handler = createServerRpc({
	id: "879b76dba7f5395f602c92fafd0e377957082cd5c110c96278a1e1fc0d4cef3e",
	name: "askInsight",
	filename: "src/lib/calu/api.ts"
}, (opts) => askInsight.__executeServer(opts));
var askInsight = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({ day: dayOf(input?.day) })).handler(askInsight_createServerFn_handler, async ({ data, context }) => {
	return quiet(async () => {
		const contextText = await diaryContext(await getSql(), context.userId, data.day);
		const result = await guardedAi(context.userId, "text", "askInsight", "dailyInsight", async (minor) => {
			const { getAIProvider } = await import("./ai.server-C7hCmX39.mjs");
			const call = await getAIProvider().generateDailyInsight(contextText, { minor });
			return {
				value: call.value,
				usage: call.usage
			};
		});
		if (!result.ok) return result;
		return {
			ok: true,
			data: { insight: result.data }
		};
	});
});
//#endregion
export { COACH_JSON_HINT as n, api_exports as t };
