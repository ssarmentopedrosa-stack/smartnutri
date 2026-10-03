import { o as __toESM } from "../_runtime.mjs";
import { C as useNavigate, Q as require_react, S as Navigate, T as require_jsx_runtime, x as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as sumFoods, O as recommend, _ as localInsight, b as mealLabel, k as round1 } from "./validation-D7j3wXdT.mjs";
import { cacheHome, dropQueued, friendlyError, isOfflineError, readCachedHome, readQueue, todayKey } from "./client-BomANk9E.mjs";
import { n as useCurrentUserState } from "./use-current-user-C6j3ciP_.mjs";
import { D as track, h as getHome, r as addWater, x as saveMeal } from "./api-BgGs2_Z7.mjs";
import { a as Search, c as PenLine, o as ScanBarcode, p as Camera, u as Mic } from "../_libs/lucide-react.mjs";
import { a as Meter, n as Button, s as Shell, t as Boot } from "./chrome-BdSW11gm.mjs";
import { n as parseISO, r as format, t as ptBR } from "../_libs/date-fns.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-665kEAvd.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FALLBACK_GOALS = {
	calories: 2e3,
	protein: 100,
	carbohydrates: 220,
	fat: 65,
	fiber: 25,
	waterMl: 2500
};
function HomePage() {
	const { user, isPending } = useCurrentUserState();
	const [day, setDay] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => setDay(todayKey()), []);
	if (isPending || !day) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Boot, {});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/login" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HomeBody, {
		day,
		userId: user.id,
		onDay: setDay
	});
}
function HomeBody({ day, userId, onDay }) {
	const navigate = useNavigate();
	const [home, setHome] = (0, import_react.useState)(null);
	const [offline, setOffline] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const [loading, setLoading] = (0, import_react.useState)(true);
	async function load() {
		try {
			const queue = readQueue(userId);
			for (const meal of queue) try {
				if ((await saveMeal({ data: meal })).ok) dropQueued(userId, meal.id);
			} catch (err) {
				if (isOfflineError(err)) break;
			}
			const result = await getHome({ data: { day } });
			if (!result.ok) {
				setError(result.error);
				const cached = readCachedHome(userId, day);
				if (cached) {
					setHome(cached);
					setOffline(true);
				}
				return;
			}
			setHome(result.data);
			cacheHome(userId, day, result.data);
			setOffline(false);
			setError("");
		} catch (err) {
			const cached = readCachedHome(userId, day);
			if (cached) {
				setHome(cached);
				setOffline(true);
			} else setError(friendlyError(err));
		} finally {
			setLoading(false);
		}
	}
	(0, import_react.useEffect)(() => {
		load();
		if (!sessionStorage.getItem("calu.open")) {
			sessionStorage.setItem("calu.open", "1");
			track({ data: "app_open" }).catch(() => void 0);
		}
	}, [day, userId]);
	(0, import_react.useEffect)(() => {
		const zone = home?.profile?.timezone;
		if (!zone) return;
		const zoned = todayKey(/* @__PURE__ */ new Date(), zone);
		if (zoned !== day) onDay(zoned);
	}, [
		home?.profile?.timezone,
		day,
		onDay
	]);
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Boot, {});
	if (!home?.profile) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/comecar" });
	const goals = home.goals ?? {
		...FALLBACK_GOALS,
		isEstimate: true,
		qualitative: false,
		source: "AI_ESTIMATE"
	};
	const minor = home.profile.age != null && home.profile.age < 18 || Boolean(home.goals?.qualitative);
	const foods = home.meals.flatMap((meal) => meal.foods);
	const totals = foods.length ? sumFoods(foods) : {
		calories: home.meals.reduce((s, m) => s + m.calories, 0),
		protein: home.meals.reduce((s, m) => s + m.protein, 0),
		carbohydrates: home.meals.reduce((s, m) => s + m.carbohydrates, 0),
		fat: home.meals.reduce((s, m) => s + m.fat, 0),
		fiber: home.meals.reduce((s, m) => s + m.fiber, 0),
		incomplete: home.meals.some((m) => m.incomplete)
	};
	const hour = (/* @__PURE__ */ new Date()).getHours();
	const insight = localInsight({
		totals,
		goals,
		waterMl: home.waterMl,
		mealCount: home.meals.length,
		hour
	});
	const idea = recommend({
		diet: home.profile.diet,
		totals,
		goals,
		mealTypes: home.meals.map((m) => m.mealType),
		memory: home.memory.map((m) => m.fact)
	});
	const dateLabel = format(parseISO(day), "EEEE, d 'de' MMMM", { locale: ptBR });
	async function drink(amount) {
		const result = await addWater({ data: {
			day,
			amountMl: amount
		} });
		if (result.ok) setHome((current) => current ? {
			...current,
			waterMl: result.data.waterMl
		} : current);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shell, {
		title: dateLabel,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rise",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "font-display text-4xl leading-none font-medium tracking-tight",
					children: ["Olá, ", home.profile.name]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-muted",
					children: "Como está sua alimentação hoje?"
				}),
				offline ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted",
					children: "Sem conexão. Mostrando o que estava salvo neste aparelho. A análise por IA precisa de internet."
				}) : null,
				error && !offline ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-danger",
					children: error
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "mt-6 rounded-3xl border border-border bg-card p-4",
					children: [
						minor ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Acompanhamento qualitativo"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 text-sm leading-6",
							children: [
								"Sem meta calórica automática. Hoje há ",
								home.meals.length,
								" refeição(ões) registrada(s)",
								home.meals.length ? ` · ~${Math.round(totals.calories)} kcal anotadas` : "",
								". Água: ",
								home.waterMl,
								" ml."
							]
						})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
							label: "Calorias",
							value: totals.calories,
							goal: goals.calories,
							unit: "kcal"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 grid grid-cols-2 gap-x-4 gap-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
									label: "Proteína",
									value: totals.protein,
									goal: goals.protein,
									unit: "g"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
									label: "Carboidratos",
									value: totals.carbohydrates,
									goal: goals.carbohydrates,
									unit: "g"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
									label: "Gorduras",
									value: totals.fat,
									goal: goals.fat,
									unit: "g"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
									label: "Fibras",
									value: totals.fiber,
									goal: goals.fiber,
									unit: "g"
								})
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
								label: "Água",
								value: round1(home.waterMl / 1e3),
								goal: round1(goals.waterMl / 1e3),
								unit: "L",
								tone: "water"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-3 flex gap-2",
								children: [200, 350].map((amount) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "secondary",
									className: "h-11 flex-1",
									onClick: () => void drink(amount),
									children: [
										"+",
										amount,
										" ml"
									]
								}, amount))
							})]
						}),
						totals.incomplete ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-xs text-subtle",
							children: "Parte do dia está sem dados completos. O total é parcial."
						}) : null,
						goals.isEstimate && !minor ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-xs text-subtle",
							children: "Referência diária estimada. Não é uma meta obrigatória e não substitui orientação profissional."
						}) : null
					]
				}),
				home.week?.lines?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "mt-4 rounded-3xl bg-card px-4 py-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-xl font-medium",
						children: "O que percebi esta semana"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-2 space-y-2 text-sm leading-6",
						children: home.week.lines.slice(0, 3).map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: line }, line))
					})]
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "mt-4 rounded-3xl bg-card px-4 py-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm leading-6",
						children: insight
					}), idea ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: idea
					}) : null]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-8 font-display text-2xl font-medium",
					children: "Registrar refeição"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 grid grid-cols-2 gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
							icon: Camera,
							label: "Foto",
							onClick: () => navigate({
								to: "/registrar",
								search: {
									modo: "foto",
									id: ""
								}
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
							icon: Mic,
							label: "Voz",
							onClick: () => navigate({
								to: "/registrar",
								search: {
									modo: "voz",
									id: ""
								}
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
							icon: PenLine,
							label: "Texto",
							onClick: () => navigate({
								to: "/registrar",
								search: {
									modo: "texto",
									id: ""
								}
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
							icon: Search,
							label: "Buscar alimento",
							onClick: () => navigate({
								to: "/registrar",
								search: {
									modo: "busca",
									id: ""
								}
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "ghost",
					className: "mt-2 w-full",
					onClick: () => navigate({
						to: "/registrar",
						search: {
							modo: "codigo",
							id: ""
						}
					}),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanBarcode, { className: "size-4" }), "Código de barras"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 text-xs text-subtle",
					children: [
						"Análises de foto hoje: ",
						home.usage.image,
						"/",
						home.usage.limits.image
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-8 font-display text-2xl font-medium",
					children: "Hoje"
				}),
				home.daily ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: home.daily.completeness
				}) : null,
				home.meals.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "Nada registrado ainda. Uma refeição já organiza o dia."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 space-y-2",
					children: home.meals.map((meal) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/diario",
						className: "block rounded-2xl border border-border bg-card px-4 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-baseline justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-medium",
								children: mealLabel(meal.mealType)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "tabular-nums text-sm text-muted",
								children: [
									"~",
									Math.round(meal.calories),
									" kcal"
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 truncate text-sm text-muted",
							children: meal.foods.map((food) => food.name).join(", ")
						})]
					}) }, meal.id))
				})
			]
		})
	});
}
function Action({ icon: Icon, label, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: "press flex h-24 flex-col items-start justify-between rounded-3xl border border-border bg-card p-4 text-left",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
			className: "size-5",
			strokeWidth: 1.75
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-medium",
			children: label
		})]
	});
}
//#endregion
export { HomePage as component };
