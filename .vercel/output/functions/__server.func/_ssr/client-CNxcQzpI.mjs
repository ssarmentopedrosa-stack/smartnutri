import { a as getServerFnById, i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { _ as makeFood, a as GOALS, i as DIETS, l as authMiddleware, o as MEAL_TYPES, s as UNITS, t as ACTIVITIES } from "./middleware-DXgQgsCD.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/client-CNxcQzpI.js
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function dayOf(value) {
	const day = String(value ?? "");
	if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Data inválida.");
	return day;
}
function num(value) {
	if (value == null || value === "") return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
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
		const draft = makeFood({
			id: String(food.id || crypto.randomUUID()),
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
		return draft;
	});
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
		recalculate: body.recalculate === true
	};
}
var track = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((name) => String(name ?? "")).handler(createSsrRpc("c55390699d82cd3ab2d04eac7446cca28b70c1c3fff85836dd90f785bdce943e"));
var getHome = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({ day: dayOf(input?.day) })).handler(createSsrRpc("949850fd6aceff9a9274e572271e1fb5f836c09c6923b27c1471547f990d4380"));
var saveProfile = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => parseProfile(input)).handler(createSsrRpc("ef04d8fd72b5e6a7436e9e10e9f0c05419ea544c3ba26da156243927c89c3b44"));
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
}).handler(createSsrRpc("960780eaed2bc7aa6821f6a1cb8025a2c74351e3af8043d32b54ccdf3d501967"));
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
var saveMeal = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => parseMeal(input)).handler(createSsrRpc("dec1ea4da53b10a3e1c6dc2d17c6bf76d7b86d8010ce7366fe04d331516965e8"));
var deleteMeal = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => String(id ?? "")).handler(createSsrRpc("d60afee2617786c0d60773f05ff548572a644237fa9c03ae8c61be68939960d8"));
var duplicateMeal = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	id: String(input?.id ?? ""),
	day: dayOf(input?.day)
})).handler(createSsrRpc("9ef3f457c8abde30f02b125cc4934d6d6df82b2dc016d94f2e600faa86007cf9"));
function hintFrom(input) {
	return String(input.hint ?? "").slice(0, 500);
}
var analyzePhoto = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const body = input ?? {};
	let image = String(body.imageBase64 ?? "");
	const embedded = image.match(/base64,([A-Za-z0-9+/=\s]+)$/);
	if (embedded) image = embedded[1] ?? "";
	image = image.replace(/\s/g, "");
	if (image.length < 80 || image.length > 18e5 || !/^[A-Za-z0-9+/=]+$/.test(image)) throw new Error("Não consegui ler essa foto. Tente outra, mais próxima e em JPG.");
	return {
		image,
		hint: hintFrom(body),
		hour: Number(body.hour) || 12,
		day: dayOf(body.day)
	};
}).handler(createSsrRpc("3c5c7a9a46e5022fd5f2fee92ca419ecbcedd14c5fc60de70c206faf9f2e72aa"));
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
}).handler(createSsrRpc("31ff68b6de2671c50bced77530ec16530a1815e954ab66bc42e6c9ee3a2f8187"));
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
}).handler(createSsrRpc("457be820c823fbb22e98a3594b12d27b28b942789eddd5333cab7a32d2510903"));
var saveWeight = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const weight = Number(input?.weightKg);
	if (!Number.isFinite(weight) || weight < 30 || weight > 300) throw new Error("Informe um peso entre 30 e 300 kg.");
	return {
		day: dayOf(input?.day),
		weightKg: Math.round(weight * 10) / 10
	};
}).handler(createSsrRpc("aec5c69a5f0da4881994a88fb34a6db94fc4acb48517ead9c7f57091f611525f"));
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
}).handler(createSsrRpc("4e7979d168c0c61a61777db323cf398ad8393c73b713ada910a84730334f4e6f"));
var saveHabits = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const body = input ?? {};
	return {
		water: body.water === true,
		produce: body.produce === true,
		meals: body.meals === true,
		activity: body.activity === true,
		sleep: body.sleep === true
	};
}).handler(createSsrRpc("a857c794d0f985709d325a7be67a932ebb00acf8264407e38dde0265c207da33"));
var toggleCheck = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const habit = String(input?.habit ?? "");
	if (![
		"produce",
		"activity",
		"sleep"
	].includes(habit)) throw new Error("Hábito inválido.");
	return {
		day: dayOf(input?.day),
		habit,
		done: input?.done === true
	};
}).handler(createSsrRpc("06348902c8c2db6aa00281fe572ac30d439785ef11474bb9f989bd9a5ca33f04"));
var setNotifications = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((enabled) => enabled === true).handler(createSsrRpc("d2d9636a5a2552f197994ff5c881ff9a675c438f24a58832784859c6893e76f6"));
var sendChat = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => {
	const message = String(input?.message ?? "").trim();
	if (message.length < 1 || message.length > 1500) throw new Error("Escreva uma mensagem curta.");
	return {
		message,
		day: dayOf(input?.day)
	};
}).handler(createSsrRpc("e2dedb0307ed957a23fe7af5f265c1af94527322d26de8091d5fa2884f207b83"));
var listChat = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(() => ({})).handler(createSsrRpc("8f9fa1a5d2c2e7469da2d9e53dbc9f76437ad77017bc8c792a777cb48e08805a"));
var deleteMemory = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => String(id ?? "")).handler(createSsrRpc("4917af8ac2c61611754490b57c54d91265ff5947bcf2fcb497734e5bae64239c"));
var addMemory = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((fact) => {
	const text = String(fact ?? "").trim();
	if (text.length < 3 || text.length > 240) throw new Error("Escreva um fato curto.");
	return text;
}).handler(createSsrRpc("43917d76dcfbb027d0640d34a85935282ce01c0a70e99cf875fe496e7c41efdb"));
var lookupBarcode = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((code) => String(code ?? "").replace(/\D/g, "").slice(0, 20)).handler(createSsrRpc("cdd68d43665309a34e797baf86f25cc5793581f0624db4871bfbbeaaa7fa3cfe"));
var exportData = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(() => ({})).handler(createSsrRpc("6bf6c8657e27577c1da84cffdf2551317dc94d234edf56f8fe06b9c028559e8a"));
var deleteHistory = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(() => ({})).handler(createSsrRpc("1ab172087df397cc2924de8a8862ee1a61d1ce3c8563fa141090508044932658"));
var deleteAccountData = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(() => ({})).handler(createSsrRpc("bb1063cb51e5401bfaf8536563a233b5e531757b1c9dfd622c8ea22acc316827"));
var askInsight = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({ day: dayOf(input?.day) })).handler(createSsrRpc("879b76dba7f5395f602c92fafd0e377957082cd5c110c96278a1e1fc0d4cef3e"));
var QUEUE = "calu.queue.v1";
var CACHE = "calu.cache.v1";
function todayKey(date = /* @__PURE__ */ new Date()) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function shiftDay(day, delta) {
	const date = /* @__PURE__ */ new Date(`${day}T12:00:00`);
	date.setDate(date.getDate() + delta);
	return todayKey(date);
}
function friendlyError(error) {
	const msg = error instanceof Error ? error.message : "";
	if (/unauthorized/i.test(msg)) return "Sua sessão expirou. Entre de novo para continuar.";
	if (/failed to fetch|network|offline|load failed/i.test(msg)) return "Sem conexão no momento.";
	if (msg && msg.length < 180 && !/sql|postgres|syntax/i.test(msg)) return msg;
	return "Algo não saiu como esperado. Tente outra vez.";
}
function isOfflineError(error) {
	const msg = error instanceof Error ? error.message : String(error ?? "");
	return /failed to fetch|network|offline|load failed|sem conexão/i.test(msg);
}
function readQueue() {
	try {
		const raw = localStorage.getItem(QUEUE);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
function enqueueMeal(meal) {
	const queue = readQueue().filter((item) => item.id !== meal.id);
	queue.push(meal);
	localStorage.setItem(QUEUE, JSON.stringify(queue));
}
function dropQueued(id) {
	localStorage.setItem(QUEUE, JSON.stringify(readQueue().filter((item) => item.id !== id)));
}
function cacheHome(day, data) {
	try {
		const current = JSON.parse(localStorage.getItem(CACHE) || "{}");
		current[day] = data;
		localStorage.setItem(CACHE, JSON.stringify(current));
	} catch {}
}
function readCachedHome(day) {
	try {
		return JSON.parse(localStorage.getItem(CACHE) || "{}")[day] ?? null;
	} catch {
		return null;
	}
}
function compressImage(file) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const image = new Image();
		image.onload = () => {
			const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
			const canvas = document.createElement("canvas");
			canvas.width = Math.max(1, Math.round(image.width * scale));
			canvas.height = Math.max(1, Math.round(image.height * scale));
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				URL.revokeObjectURL(url);
				reject(/* @__PURE__ */ new Error("Não consegui preparar a foto."));
				return;
			}
			ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
			const data = canvas.toDataURL("image/jpeg", .72);
			URL.revokeObjectURL(url);
			resolve(data.split(",")[1] ?? "");
		};
		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(/* @__PURE__ */ new Error("Não consegui ler essa foto. Tente outra em JPG."));
		};
		image.src = url;
	});
}
//#endregion
export { setNotifications as A, readQueue as C, saveProfile as D, saveMeal as E, todayKey as M, toggleCheck as N, saveWeight as O, track as P, readCachedHome as S, saveHabits as T, getHome as _, askInsight as a, listChat as b, deleteAccountData as c, deleteMemory as d, dropQueued as f, friendlyError as g, exportData as h, analyzeText as i, shiftDay as j, sendChat as k, deleteHistory as l, enqueueMeal as m, addWater as n, cacheHome as o, duplicateMeal as p, analyzePhoto as r, compressImage as s, addMemory as t, deleteMeal as u, getProgress as v, saveGoals as w, lookupBarcode as x, isOfflineError as y };
