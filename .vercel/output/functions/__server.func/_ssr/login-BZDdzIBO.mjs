import { o as __toESM } from "../_runtime.mjs";
import { Q as require_react, S as Navigate, T as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as signIn, t as authClient } from "./client-1vAx-gM_.mjs";
import { n as useCurrentUserState } from "./use-current-user-BYyFvsCd.mjs";
import { c as controlClass, i as Mark, n as Button, o as Screen, r as Field, t as Boot } from "./chrome-BdSW11gm.mjs";
import { t as GROK_PROVIDERS } from "./server-CT4NW50T.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-BZDdzIBO.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function LoginPage() {
	const { user, isPending } = useCurrentUserState();
	const [mode, setMode] = (0, import_react.useState)("up");
	const [name, setName] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Boot, {});
	if (user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/" });
	async function submit() {
		setBusy(true);
		setError("");
		const result = mode === "up" ? await authClient.signUp.email({
			email,
			password,
			name: name || "Você",
			callbackURL: "/"
		}) : await authClient.signIn.email({
			email,
			password,
			callbackURL: "/"
		});
		setBusy(false);
		if (result.error) {
			const message = result.error.message ?? "";
			if (/exist/i.test(message)) setError("Já existe uma conta com esse e-mail. Entre com a senha.");
			else if (/password|invalid|credential/i.test(message)) setError("E-mail ou senha não conferem.");
			else setError("Não consegui entrar agora. Tente de novo.");
			return;
		}
		window.location.assign("/");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Screen, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rise",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, { className: "size-12" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-6 font-display text-4xl leading-tight font-medium tracking-tight",
				children: "Entre no CALU"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-muted",
				children: "Seu diário fica só na sua conta. A Calu estima. Você confirma."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8 space-y-3",
				children: GROK_PROVIDERS.map((provider) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "secondary",
					className: "w-full",
					onClick: () => signIn(provider.providerId, { callbackURL: "/" }),
					children: ["Continuar com ", provider.label]
				}, provider.providerId))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "my-6 h-px bg-border" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "space-y-3",
				onSubmit: (event) => {
					event.preventDefault();
					submit();
				},
				children: [
					mode === "up" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Nome",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: controlClass,
							value: name,
							onChange: (e) => setName(e.target.value),
							autoComplete: "name"
						})
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "E-mail",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: controlClass,
							type: "email",
							value: email,
							onChange: (e) => setEmail(e.target.value),
							autoComplete: "email",
							required: true
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Senha",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: controlClass,
							type: "password",
							value: password,
							onChange: (e) => setPassword(e.target.value),
							autoComplete: mode === "up" ? "new-password" : "current-password",
							minLength: 8,
							required: true
						})
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-danger",
						children: error
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						className: "w-full",
						disabled: busy,
						children: busy ? "Aguarde" : mode === "up" ? "Criar conta" : "Entrar"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "mt-4 text-sm text-muted",
				onClick: () => setMode(mode === "up" ? "in" : "up"),
				children: mode === "up" ? "Já tenho conta" : "Criar uma conta"
			})
		]
	}) });
}
//#endregion
export { LoginPage as component };
