import { o as __toESM } from "../_runtime.mjs";
import { C as useNavigate, Q as require_react, S as Navigate, T as require_jsx_runtime, x as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as useCurrentUserState } from "./use-current-user-BYyFvsCd.mjs";
import { D as saveProfile, g as friendlyError } from "./client-CNxcQzpI.mjs";
import { i as Mark, n as Button, o as Screen, t as Boot } from "./chrome-BdSW11gm.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as emptyProfileForm, r as toProfilePayload, t as ProfileFields } from "./profile-form-CYyKPGnp.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/comecar-BCVvcYgi.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var SLIDES = [
	{
		title: "Conheça a Calu",
		body: "Uma IA para ajudar você a entender sua alimentação. Não é nutricionista e não é médica."
	},
	{
		title: "Registre sem complicação",
		body: "Foto, voz ou texto. Poucos passos, sem dezenas de campos."
	},
	{
		title: "Veja seus hábitos",
		body: "Entenda sua alimentação ao longo do tempo, sem nota e sem competição."
	},
	{
		title: "Você continua no controle",
		body: "A IA faz estimativas. Você confirma e corrige. Só o que você confirmar entra no diário."
	}
];
function StartPage() {
	const { user, isPending } = useCurrentUserState();
	const navigate = useNavigate();
	const [step, setStep] = (0, import_react.useState)(0);
	const [form, setForm] = (0, import_react.useState)(() => emptyProfileForm());
	const [busy, setBusy] = (0, import_react.useState)(false);
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Boot, {});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/login" });
	async function finish() {
		setBusy(true);
		try {
			const result = await saveProfile({ data: toProfilePayload({
				...form,
				name: form.name || user?.displayName || ""
			}, true) });
			if (!result.ok) {
				toast.error(result.error);
				return;
			}
			await navigate({ to: "/" });
		} catch (error) {
			toast.error(friendlyError(error));
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Screen, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, { className: "size-12" }), step < SLIDES.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rise mt-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					step + 1,
					" / ",
					SLIDES.length
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-3 font-display text-4xl leading-tight font-medium tracking-tight",
				children: SLIDES[step]?.title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-lg text-muted",
				children: SLIDES[step]?.body
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-10 flex gap-3",
				children: [step > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					onClick: () => setStep(step - 1),
					children: "Voltar"
				}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "flex-1",
					onClick: () => setStep(step + 1),
					children: "Continuar"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "mt-4 text-sm text-muted",
				onClick: () => setStep(SLIDES.length),
				children: "Pular introdução"
			})
		]
	}, step) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rise mt-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl font-medium tracking-tight",
				children: "Seu perfil"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-muted",
				children: "Usamos isso só para estimar metas. Você pode editar ou apagar depois."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileFields, {
					value: form,
					onChange: setForm,
					showConsent: true
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-4 text-sm text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/privacidade",
						className: "underline",
						children: "Política"
					}),
					" · ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/termos",
						className: "underline",
						children: "Termos"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				className: "mt-6 w-full",
				disabled: busy,
				onClick: () => void finish(),
				children: busy ? "Salvando" : "Começar"
			})
		]
	})] });
}
//#endregion
export { StartPage as component };
