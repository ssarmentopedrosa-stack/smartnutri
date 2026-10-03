import { o as __toESM } from "../_runtime.mjs";
import { Q as require_react, S as Navigate, T as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { friendlyError, todayKey } from "./client-BomANk9E.mjs";
import { n as useCurrentUserState } from "./use-current-user-C6j3ciP_.mjs";
import { _ as listChat, w as sendChat } from "./api-BgGs2_Z7.mjs";
import { c as controlClass, n as Button, o as Screen, t as Boot } from "./chrome-BdSW11gm.mjs";
import { n as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/calu-Dl0RstpU.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var SUGGESTIONS = [
	"O que posso comer no jantar?",
	"Como está minha alimentação hoje?",
	"Quais alimentos têm mais proteína?",
	"Me dê uma opção rápida de lanche."
];
function CaluPage() {
	const { user, isPending } = useCurrentUserState();
	const [day, setDay] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => setDay(todayKey()), []);
	if (isPending || !day) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Boot, {});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/login" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chat, { day });
}
function Chat({ day }) {
	const [messages, setMessages] = (0, import_react.useState)([]);
	const [text, setText] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [ready, setReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		listChat().then((result) => {
			if (result.ok) setMessages(result.data.messages);
		}).finally(() => setReady(true));
	}, []);
	async function send(message) {
		const clean = message.trim();
		if (!clean || busy) return;
		setText("");
		setBusy(true);
		setMessages((curr) => [...curr, {
			id: crypto.randomUUID(),
			role: "user",
			content: clean
		}]);
		try {
			const result = await sendChat({ data: {
				message: clean,
				day
			} });
			if (!result.ok) toast.error(result.error);
			else setMessages((curr) => [...curr, {
				id: crypto.randomUUID(),
				role: "assistant",
				content: result.data.reply
			}]);
		} catch (error) {
			toast.error(friendlyError(error));
		} finally {
			setBusy(false);
		}
	}
	if (!ready) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Boot, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Screen, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-3xl font-medium",
			children: "Converse com a Calu"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-muted",
			children: "Ela lê o que você registrou hoje. Não prescreve dieta e não substitui um profissional."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6 space-y-3",
			children: [messages.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-2",
				children: SUGGESTIONS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "rounded-full border border-border bg-card px-3 py-2 text-left text-sm",
					onClick: () => void send(item),
					children: item
				}, item))
			}) : messages.map((message) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: message.role === "user" ? "ml-8 rounded-3xl bg-primary px-4 py-3 text-sm text-primary-foreground" : "mr-6 rounded-3xl bg-card px-4 py-3 text-sm leading-6",
				children: message.content
			}, message.id)), busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Calu está lendo o dia..."
			}) : null]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "mt-6 flex gap-2",
			onSubmit: (event) => {
				event.preventDefault();
				send(text);
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: controlClass,
				value: text,
				onChange: (e) => setText(e.target.value),
				placeholder: "Escreva para a Calu"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				disabled: busy,
				className: "shrink-0",
				children: "Enviar"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-4 text-xs text-subtle",
			children: "Diga “lembre que…” para guardar uma preferência. Você pode apagar isso no perfil."
		})
	] });
}
//#endregion
export { CaluPage as component };
