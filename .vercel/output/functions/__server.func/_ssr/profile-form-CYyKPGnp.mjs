import { T as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as GOALS, i as DIETS, t as ACTIVITIES } from "./middleware-DXgQgsCD.mjs";
import { c as controlClass, r as Field } from "./chrome-BdSW11gm.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/profile-form-CYyKPGnp.js
var import_jsx_runtime = require_jsx_runtime();
var emptyProfileForm = () => ({
	name: "",
	age: "",
	sex: "nao_informar",
	heightCm: "",
	weightKg: "",
	goal: "acompanhar",
	activity: "leve",
	diet: "livre",
	dietNote: "",
	restrictions: "",
	consent: false
});
function ProfileFields({ value, onChange, showConsent }) {
	const set = (patch) => onChange({
		...value,
		...patch
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Nome",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: controlClass,
					value: value.name,
					onChange: (e) => set({ name: e.target.value }),
					autoComplete: "name"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Idade",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: controlClass,
						inputMode: "numeric",
						value: value.age,
						onChange: (e) => set({ age: e.target.value })
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Sexo, se quiser",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: controlClass,
						value: value.sex,
						onChange: (e) => set({ sex: e.target.value }),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "nao_informar",
								children: "Não informar"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "feminino",
								children: "Feminino"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "masculino",
								children: "Masculino"
							})
						]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Altura (cm)",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: controlClass,
						inputMode: "decimal",
						value: value.heightCm,
						onChange: (e) => set({ heightCm: e.target.value })
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Peso (kg)",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: controlClass,
						inputMode: "decimal",
						value: value.weightKg,
						onChange: (e) => set({ weightKg: e.target.value })
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Objetivo",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					className: controlClass,
					value: value.goal,
					onChange: (e) => set({ goal: e.target.value }),
					children: GOALS.map((goal) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: goal.id,
						children: goal.label
					}, goal.id))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Atividade",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					className: controlClass,
					value: value.activity,
					onChange: (e) => set({ activity: e.target.value }),
					children: ACTIVITIES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: item.id,
						children: item.label
					}, item.id))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Preferência alimentar",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					className: controlClass,
					value: value.diet,
					onChange: (e) => set({ diet: e.target.value }),
					children: DIETS.map((diet) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: diet.id,
						children: diet.label
					}, diet.id))
				})
			}),
			value.diet === "outra" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Conte do seu jeito",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: controlClass,
					value: value.dietNote,
					onChange: (e) => set({ dietNote: e.target.value })
				})
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Restrições, se quiser informar",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					className: controlClass + " h-24 py-3",
					value: value.restrictions,
					onChange: (e) => set({ restrictions: e.target.value }),
					placeholder: "A Calu não infere alergias."
				})
			}),
			Number(value.age) > 0 && Number(value.age) < 16 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "O CALU é pensado para adultos. Menores devem usar com um responsável."
			}) : null,
			showConsent ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex items-start gap-3 text-sm leading-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					className: "mt-1 size-4",
					checked: value.consent,
					onChange: (e) => set({ consent: e.target.checked })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Li a Política de Privacidade e os Termos. Entendo que a Calu faz estimativas e não substitui um profissional de saúde." })]
			}) : null
		]
	});
}
function toProfilePayload(value, recalculate) {
	return {
		name: value.name,
		age: value.age.trim() ? Number(value.age) : null,
		sex: value.sex,
		heightCm: value.heightCm.trim() ? Number(value.heightCm.replace(",", ".")) : null,
		weightKg: value.weightKg.trim() ? Number(value.weightKg.replace(",", ".")) : null,
		goal: value.goal,
		activity: value.activity,
		diet: value.diet,
		dietNote: value.dietNote,
		restrictions: value.restrictions,
		consent: value.consent,
		recalculate
	};
}
//#endregion
export { emptyProfileForm as n, toProfilePayload as r, ProfileFields as t };
