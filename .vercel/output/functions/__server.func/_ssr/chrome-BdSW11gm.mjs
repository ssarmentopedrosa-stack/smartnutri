import { T as require_jsx_runtime, m as useRouterState, x as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { d as MessageCircle, f as House, m as BookOpen, r as TrendingUp, t as User } from "../_libs/lucide-react.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/chrome-BdSW11gm.js
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function Mark({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 32 32",
		className,
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				width: "32",
				height: "32",
				rx: "10",
				className: "fill-primary"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M9.5 18.5c1.2 3 3.6 4.6 6.5 4.6s5.3-1.6 6.5-4.6",
				fill: "none",
				stroke: "#fff8f4",
				strokeWidth: "1.8",
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M11 14.5h10",
				stroke: "#fff8f4",
				strokeWidth: "1.6",
				strokeLinecap: "round"
			})
		]
	});
}
var buttonStyles = {
	primary: "bg-primary text-primary-foreground",
	secondary: "border border-border bg-card text-foreground",
	ghost: "bg-transparent text-foreground",
	danger: "bg-transparent text-danger"
};
function Button({ variant = "primary", className, type = "button", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type,
		className: cn("press inline-flex h-12 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium disabled:opacity-50", buttonStyles[variant], className),
		...props
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mb-1.5 block text-sm text-muted",
			children: label
		}), children]
	});
}
var controlClass = "h-12 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-primary/30";
function Meter({ label, value, goal, unit, tone = "primary" }) {
	const pct = goal > 0 ? Math.min(100, Math.round(value / goal * 100)) : 0;
	const shown = Number.isInteger(value) ? value : value.toFixed(1).replace(".", ",");
	const goalShown = Number.isInteger(goal) ? goal : goal.toFixed(1).replace(".", ",");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-baseline justify-between gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-sm text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "tabular-nums text-sm font-medium",
			children: [
				shown,
				" / ",
				goalShown,
				" ",
				unit
			]
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-2 h-1.5 overflow-hidden rounded-full bg-border",
		"aria-hidden": "true",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: cn("h-full rounded-full", tone === "water" ? "bg-water" : "bg-primary"),
			style: { width: `${pct}%` }
		})
	})] });
}
var TABS = [
	{
		to: "/",
		label: "Início",
		icon: House
	},
	{
		to: "/diario",
		label: "Diário",
		icon: BookOpen
	},
	{
		to: "/progresso",
		label: "Progresso",
		icon: TrendingUp
	},
	{
		to: "/calu",
		label: "Calu",
		icon: MessageCircle
	},
	{
		to: "/perfil",
		label: "Perfil",
		icon: User
	}
];
function Shell({ children, title }) {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-dvh bg-canvas",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex min-h-dvh w-full max-w-[430px] flex-col border-border bg-background md:border-x",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "flex items-center gap-3 px-5 pt-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, { className: "size-9 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-lg leading-none font-medium tracking-tight",
							children: "CALU"
						}), title ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 truncate text-sm text-muted",
							children: title
						}) : null]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
					className: "flex-1 px-5 pt-6 pb-28",
					children
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "fixed bottom-0 left-1/2 z-20 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-background/95",
					style: { paddingBottom: "env(safe-area-inset-bottom)" },
					"aria-label": "Principal",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "grid grid-cols-5",
						children: TABS.map((tab) => {
							const active = tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
							const Icon = tab.icon;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: tab.to,
								"aria-current": active ? "page" : void 0,
								className: cn("flex h-16 flex-col items-center justify-center gap-1 text-xs", active ? "text-primary" : "text-subtle"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
									className: "size-5",
									strokeWidth: 1.75
								}), tab.label]
							}) }, tab.to);
						})
					})
				})
			]
		})
	});
}
function Screen({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-dvh bg-canvas",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mx-auto min-h-dvh w-full max-w-[430px] bg-background px-5 py-8 md:border-x md:border-border",
			children
		})
	});
}
function Boot() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Screen, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, { className: "size-12" }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "mt-6 font-display text-4xl font-medium tracking-tight",
			children: "CALU"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-muted",
			children: "Seu acompanhamento alimentar inteligente."
		})
	] });
}
//#endregion
export { Meter as a, controlClass as c, Mark as i, Button as n, Screen as o, Field as r, Shell as s, Boot as t };
