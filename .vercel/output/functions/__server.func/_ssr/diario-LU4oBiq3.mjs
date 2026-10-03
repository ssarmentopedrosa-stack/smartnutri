import { o as __toESM } from "../_runtime.mjs";
import { C as useNavigate, Q as require_react, S as Navigate, T as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { b as mealLabel, c as MEAL_TYPES } from "./validation-D7j3wXdT.mjs";
import { friendlyError, shiftDay, todayKey } from "./client-BomANk9E.mjs";
import { n as useCurrentUserState } from "./use-current-user-C6j3ciP_.mjs";
import { f as duplicateMeal, h as getHome, u as deleteMeal } from "./api-BgGs2_Z7.mjs";
import { n as Button, s as Shell, t as Boot } from "./chrome-BdSW11gm.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as parseISO, r as format, t as ptBR } from "../_libs/date-fns.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/diario-LU4oBiq3.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function DiaryPage() {
	const { user, isPending } = useCurrentUserState();
	const [day, setDay] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => setDay(todayKey()), []);
	if (isPending || !day) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Boot, {});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/login" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DiaryBody, {
		day,
		setDay
	});
}
function DiaryBody({ day, setDay }) {
	const navigate = useNavigate();
	const [home, setHome] = (0, import_react.useState)(null);
	const [open, setOpen] = (0, import_react.useState)(null);
	const [confirmId, setConfirmId] = (0, import_react.useState)(null);
	async function load(next = day) {
		const result = await getHome({ data: { day: next } });
		if (result.ok) setHome(result.data);
		else toast.error(result.error);
	}
	(0, import_react.useEffect)(() => {
		load();
	}, [day]);
	if (!home) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Boot, {});
	if (!home.profile) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/comecar" });
	const grouped = MEAL_TYPES.map((type) => ({
		...type,
		meals: home.meals.filter((meal) => meal.mealType === type.id)
	})).filter((group) => group.meals.length > 0);
	function edit(meal) {
		sessionStorage.setItem("calu.edit", JSON.stringify(meal));
		navigate({
			to: "/registrar",
			search: {
				modo: "editar",
				id: meal.id
			}
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Shell, {
		title: "Meu dia",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-11 px-2 text-sm",
					onClick: () => setDay(shiftDay(day, -1)),
					children: "Anterior"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-center font-display text-2xl font-medium capitalize",
					children: format(parseISO(day), "d MMM", { locale: ptBR })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-11 px-2 text-sm disabled:opacity-40",
					disabled: day >= todayKey(),
					onClick: () => setDay(shiftDay(day, 1)),
					children: "Próximo"
				})
			]
		}), grouped.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-8 text-muted",
			children: "Nenhuma refeição neste dia."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-6 space-y-4",
			children: grouped.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-sm tracking-wide text-muted uppercase",
				children: group.label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-2 space-y-2",
				children: group.meals.map((meal) => {
					const expanded = open === meal.id;
					const time = new Date(meal.eatenAt);
					const clock = Number.isNaN(time.getTime()) ? "" : time.toLocaleTimeString("pt-BR", {
						hour: "2-digit",
						minute: "2-digit"
					});
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-3xl border border-border bg-card p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "w-full text-left",
							onClick: () => setOpen(expanded ? null : meal.id),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-baseline justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium",
										children: mealLabel(meal.mealType)
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "tabular-nums text-sm",
										children: [
											"~",
											Math.round(meal.calories),
											" kcal"
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-1 text-sm text-muted",
									children: [
										clock,
										" · ",
										Math.round(meal.protein),
										" g proteína"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-sm",
									children: meal.foods.map((food) => food.name).join(" · ")
								})
							]
						}), expanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 space-y-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "text-sm text-muted",
									children: meal.foods.map((food) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
										food.name,
										" — ",
										food.quantity,
										" ",
										food.unit,
										food.calories == null ? " · Dados não disponíveis" : ` · ${food.calories} kcal`
									] }, food.id))
								}),
								meal.incomplete ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-subtle",
									children: "Total parcial."
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap gap-2 pt-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "secondary",
											className: "h-11",
											onClick: () => edit(meal),
											children: "Editar"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "secondary",
											className: "h-11",
											onClick: () => void duplicateMeal({ data: {
												id: meal.id,
												day: todayKey()
											} }).then((res) => {
												if (!res.ok) toast.error(res.error);
												else {
													toast.success("Duplicada em hoje.");
													load();
												}
											}).catch((error) => toast.error(friendlyError(error))),
											children: "Duplicar"
										}),
										confirmId === meal.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "danger",
											className: "h-11",
											onClick: () => void deleteMeal({ data: meal.id }).then(() => {
												setConfirmId(null);
												load();
											}).catch((error) => toast.error(friendlyError(error))),
											children: "Excluir agora"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											className: "h-11",
											onClick: () => setConfirmId(meal.id),
											children: "Excluir"
										})
									]
								})
							]
						}) : null]
					}, meal.id);
				})
			})] }, group.id))
		})]
	});
}
//#endregion
export { DiaryPage as component };
