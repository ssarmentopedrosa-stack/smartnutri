import { n as dayKeyInTimeZone, r as isValidTimeZone } from "./timezone-DDJkhpN0.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/client-BomANk9E.js
var QUEUE = "calu.queue.v2";
var CACHE = "calu.cache.v2";
function todayKey(date = /* @__PURE__ */ new Date(), timeZone) {
	if (timeZone && isValidTimeZone(timeZone)) return dayKeyInTimeZone(date, timeZone);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
/** Remove diário e fila locais. O banco continua sendo a fonte de verdade. */
function clearPrivateCache() {
	try {
		localStorage.removeItem(QUEUE);
		localStorage.removeItem(CACHE);
		sessionStorage.removeItem("calu.open");
	} catch {}
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
function readQueue(userId) {
	try {
		const raw = localStorage.getItem(QUEUE);
		const parsed = raw ? JSON.parse(raw) : null;
		if (!parsed || parsed.userId !== userId || !Array.isArray(parsed.meals)) return [];
		return parsed.meals;
	} catch {
		return [];
	}
}
function enqueueMeal(userId, meal) {
	const queue = readQueue(userId).filter((item) => item.id !== meal.id);
	queue.push(meal);
	localStorage.setItem(QUEUE, JSON.stringify({
		userId,
		meals: queue
	}));
}
function dropQueued(userId, id) {
	localStorage.setItem(QUEUE, JSON.stringify({
		userId,
		meals: readQueue(userId).filter((item) => item.id !== id)
	}));
}
function cacheHome(userId, day, data) {
	try {
		const current = JSON.parse(localStorage.getItem(CACHE) || "{}");
		const days = current.userId === userId ? current.days ?? {} : {};
		days[day] = data;
		localStorage.setItem(CACHE, JSON.stringify({
			userId,
			days
		}));
	} catch {}
}
function readCachedHome(userId, day) {
	try {
		const current = JSON.parse(localStorage.getItem(CACHE) || "{}");
		if (current.userId !== userId) return null;
		return current.days?.[day] ?? null;
	} catch {
		return null;
	}
}
function compressImage(file) {
	if (file.size > 8e6) return Promise.reject(/* @__PURE__ */ new Error("Essa foto é grande demais. Tente outra mais próxima, em JPG."));
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
export { cacheHome, clearPrivateCache, compressImage, dropQueued, enqueueMeal, friendlyError, isOfflineError, readCachedHome, readQueue, shiftDay, todayKey };
