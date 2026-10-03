//#region node_modules/.nitro/vite/services/ssr/assets/timezone-DDJkhpN0.js
var ZONE = /^[A-Za-z0-9_+-]{1,32}(?:\/[A-Za-z0-9_+-]{1,32}){0,2}$/;
var COMMON_TIMEZONES = [
	"America/Sao_Paulo",
	"America/Fortaleza",
	"America/Recife",
	"America/Belem",
	"America/Manaus",
	"America/Cuiaba",
	"America/Rio_Branco",
	"America/Noronha"
];
function isValidTimeZone(value) {
	if (!ZONE.test(value) || value.length > 64) return false;
	try {
		Intl.DateTimeFormat("en-US", { timeZone: value });
		return true;
	} catch {
		return false;
	}
}
function dayKeyInTimeZone(date, timeZone) {
	const zone = isValidTimeZone(timeZone) ? timeZone : "America/Sao_Paulo";
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: zone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	}).formatToParts(date);
	return `${parts.find((part) => part.type === "year")?.value ?? "1970"}-${parts.find((part) => part.type === "month")?.value ?? "01"}-${parts.find((part) => part.type === "day")?.value ?? "01"}`;
}
function shiftDayKey(day, delta) {
	const date = /* @__PURE__ */ new Date(`${day}T12:00:00Z`);
	date.setUTCDate(date.getUTCDate() + delta);
	return date.toISOString().slice(0, 10);
}
//#endregion
export { shiftDayKey as i, dayKeyInTimeZone as n, isValidTimeZone as r, COMMON_TIMEZONES as t };
