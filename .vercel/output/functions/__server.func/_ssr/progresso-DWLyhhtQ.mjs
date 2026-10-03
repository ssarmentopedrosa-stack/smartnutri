import { o as __toESM } from "../_runtime.mjs";
import { Q as require_react, S as Navigate, T as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { E as summarizeHistory } from "./middleware-DXgQgsCD.mjs";
import { n as useCurrentUserState } from "./use-current-user-BYyFvsCd.mjs";
import { M as todayKey, N as toggleCheck, O as saveWeight, T as saveHabits, _ as getHome, g as friendlyError, v as getProgress } from "./client-CNxcQzpI.mjs";
import { c as controlClass, n as Button, s as Shell, t as Boot } from "./chrome-BdSW11gm.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as CartesianGrid, i as Line, n as YAxis, o as ResponsiveContainer, r as XAxis, s as Tooltip, t as LineChart } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/progresso-DWLyhhtQ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var SPANS = [
	{
		id: 1,
		label: "Hoje"
	},
	{
		id: 7,
		label: "7 dias"
	},
	{
		id: 30,
		label: "30 dias"
	},
	{
		id: 90,
		label: "90 dias"
	}
];
function ProgressPage() {
	const { user, isPending } = useCurrentUserState();
	const [day, setDay] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => setDay(todayKey()), []);
	if (isPending || !day) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Boot, {});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/login" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProgressBody, { day });
}
function ProgressBody({ day }) {
	const [span, setSpan] = (0, import_react.useState)(7);
	const [data, setData] = (0, import_react.useState)(null);
	const [home, setHome] = (0, import_react.useState)(null);
	const [weight, setWeight] = (0, import_react.useState)("");
	async function load(nextSpan = span) {
		const result = await getProgress({ data: {
			endDay: day,
			span: nextSpan
		} });
		if (!result.ok) throw new Error(result.error);
		return result.data;
	}
	(0, import_react.useEffect)(() => {
		load(span).then(setData).catch((error) => toast.error(friendlyError(error)));
		getHome({ data: { day } }).then((result) => {
			if (result.ok) setHome(result.data);
		});
	}, [day, span]);
	if (!data || !home) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Boot, {});
	if (!home.profile) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/comecar" });
	const summary = summarizeHistory({
		span,
		meals: data.meals,
		waterByDay: data.water
	});
	const chart = data.weights.map((point) => ({
		...point,
		label: point.day.slice(5)
	}));
	async function habits(next) {
		setHome({
			...home,
			habits: next
		});
		const result = await saveHabits({ data: next });
		if (!result.ok) toast.error(result.error);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Shell, {
		title: "Seu dia, em perspectiva",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl font-medium",
				children: "Progresso"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4 flex gap-2",
				children: SPANS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setSpan(item.id),
					className: span === item.id ? "h-10 rounded-full bg-primary px-3 text-sm text-primary-foreground" : "h-10 rounded-full border border-border px-3 text-sm",
					children: item.label
				}, item.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-sm leading-6",
				children: summary.narrative
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid grid-cols-2 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Média de calorias",
						value: summary.avgCalories == null ? "—" : String(summary.avgCalories)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Média de proteína",
						value: summary.avgProtein == null ? "—" : `${summary.avgProtein} g`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Dias registrados",
						value: `${summary.recordedDays}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Água média",
						value: summary.avgWater == null ? "—" : `${summary.avgWater} ml`
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl font-medium",
						children: "Peso"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Não é necessário pesar-se diariamente."
					}),
					chart.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 h-44",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
							width: "100%",
							height: "100%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
								data: chart,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
										stroke: "#e3d8cb",
										vertical: false
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
										dataKey: "label",
										tick: {
											fill: "#5e534a",
											fontSize: 12
										},
										axisLine: false,
										tickLine: false
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
										domain: ["dataMin - 1", "dataMax + 1"],
										hide: true
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { formatter: (value) => [`${value} kg`, "Peso"] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
										type: "monotone",
										dataKey: "kg",
										stroke: "#8c3b22",
										strokeWidth: 2,
										dot: false
									})
								]
							})
						})
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-muted",
						children: chart[0] ? `Último registro: ${chart[0].kg} kg.` : "Quando você registrar um peso, ele aparece aqui."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "mt-3 flex gap-2",
						onSubmit: (event) => {
							event.preventDefault();
							saveWeight({ data: {
								day,
								weightKg: Number(weight.replace(",", "."))
							} }).then(async (result) => {
								if (!result.ok) toast.error(result.error);
								else {
									setWeight("");
									setData(await load(span));
								}
							}).catch((error) => toast.error(friendlyError(error)));
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: controlClass,
							inputMode: "decimal",
							placeholder: "kg",
							value: weight,
							onChange: (e) => setWeight(e.target.value)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							className: "shrink-0",
							children: "Registrar"
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl font-medium",
						children: "Hábitos"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Opcional. Desligue o que não quiser acompanhar."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 space-y-2",
						children: [
							["water", "Água"],
							["produce", "Frutas e vegetais"],
							["meals", "Refeições registradas"],
							["activity", "Atividade"],
							["sleep", "Sono"]
						].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: home.habits[key],
								onChange: (e) => void habits({
									...home.habits,
									[key]: e.target.checked
								})
							})]
						}, key))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 space-y-2",
						children: [
							home.habits.produce ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
								label: "Comi frutas ou vegetais hoje",
								done: home.checks.some((c) => c.habit === "produce" && c.done),
								onChange: (done) => void toggleCheck({ data: {
									day,
									habit: "produce",
									done
								} })
							}) : null,
							home.habits.activity ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
								label: "Me movimentei hoje",
								done: home.checks.some((c) => c.habit === "activity" && c.done),
								onChange: (done) => void toggleCheck({ data: {
									day,
									habit: "activity",
									done
								} })
							}) : null,
							home.habits.sleep ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
								label: "Dormi o suficiente para mim",
								done: home.checks.some((c) => c.habit === "sleep" && c.done),
								onChange: (done) => void toggleCheck({ data: {
									day,
									habit: "sleep",
									done
								} })
							}) : null
						]
					})
				]
			})
		]
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-3xl border border-border bg-card p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 font-display text-2xl tabular-nums",
			children: value
		})]
	});
}
function Check({ label, done, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "flex items-center gap-3 text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type: "checkbox",
			checked: done,
			onChange: (e) => onChange(e.target.checked)
		}), label]
	});
}
//#endregion
export { ProgressPage as component };
