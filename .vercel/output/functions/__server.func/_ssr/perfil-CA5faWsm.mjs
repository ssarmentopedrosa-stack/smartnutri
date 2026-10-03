import { o as __toESM } from "../_runtime.mjs";
import { C as useNavigate, Q as require_react, S as Navigate, T as require_jsx_runtime, x as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { p as estimateGoals } from "./validation-D7j3wXdT.mjs";
import { friendlyError, todayKey } from "./client-BomANk9E.mjs";
import { i as signOut } from "./client-DPVtbdLl.mjs";
import { n as useCurrentUserState, t as useCurrentUser } from "./use-current-user-C6j3ciP_.mjs";
import { D as track, S as saveProfile, T as setNotifications, c as deleteAccountData, d as deleteMemory, h as getHome, l as deleteHistory, n as addMemory, o as askInsight, p as exportData, s as deleteAccount, y as saveGoals } from "./api-BgGs2_Z7.mjs";
import { c as controlClass, n as Button, r as Field, s as Shell, t as Boot } from "./chrome-BdSW11gm.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as emptyProfileForm, r as toProfilePayload, t as ProfileFields } from "./profile-form-BAvKc0Tv.mjs";
import { a as hasGateSessionMarker } from "./server-pYQAy-X5.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/perfil-CA5faWsm.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var subscribeToNothing = () => () => {};
var noGateSessionOnServer = () => false;
/**
* Minimal signed-in identity chip + sign-out. Restyle freely (see the
* `design-ui` skill). Sign-out is only shown when auth is enabled (the
* disabled-auth dev user has nothing to sign out of) and the session is not
* gate-materialized — behind the gate the next request signs the viewer
* straight back in, so a sign-out control there is a broken loop.
*/
function UserButton() {
	const user = useCurrentUser();
	const [signingOut, setSigningOut] = (0, import_react.useState)(false);
	const gateSession = (0, import_react.useSyncExternalStore)(subscribeToNothing, hasGateSessionMarker, noGateSessionOnServer);
	if (!user) return null;
	const label = user.displayName ?? user.primaryEmail ?? "Account";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [
			user.profileImageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: user.profileImageUrl,
				alt: "",
				className: "h-8 w-8 rounded-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20",
				children: label.charAt(0).toUpperCase()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: label
			}),
			!gateSession && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: signingOut,
				onClick: () => {
					setSigningOut(true);
					signOut().catch(() => setSigningOut(false));
				},
				className: "cursor-pointer text-sm underline-offset-4 opacity-70 hover:underline disabled:cursor-wait disabled:no-underline",
				children: signingOut ? "Signing out…" : "Sign out"
			})
		]
	});
}
function ProfilePage() {
	const { user, isPending } = useCurrentUserState();
	const [day, setDay] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => setDay(todayKey()), []);
	if (isPending || !day) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Boot, {});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/login" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileBody, { day });
}
function ProfileBody({ day }) {
	const navigate = useNavigate();
	const [home, setHome] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(emptyProfileForm());
	const [goals, setGoals] = (0, import_react.useState)({
		calories: "",
		protein: "",
		carbohydrates: "",
		fat: "",
		fiber: "",
		waterMl: ""
	});
	const [fact, setFact] = (0, import_react.useState)("");
	const [insight, setInsight] = (0, import_react.useState)("");
	const [confirm, setConfirm] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		track({ data: "subscription_screen_opened" }).catch(() => void 0);
		getHome({ data: { day } }).then((result) => {
			if (!result.ok || !result.data.profile) return;
			const profile = result.data.profile;
			setHome(result.data);
			setForm({
				name: profile.name,
				age: profile.age?.toString() ?? "",
				sex: profile.sex,
				heightCm: profile.heightCm?.toString() ?? "",
				weightKg: profile.weightKg?.toString() ?? "",
				goal: profile.goal,
				activity: profile.activity,
				diet: profile.diet,
				dietNote: profile.dietNote,
				restrictions: profile.restrictions,
				consent: true,
				timezone: profile.timezone
			});
			if (result.data.goals) {
				const g = result.data.goals;
				setGoals({
					calories: String(g.calories),
					protein: String(g.protein),
					carbohydrates: String(g.carbohydrates),
					fat: String(g.fat),
					fiber: String(g.fiber),
					waterMl: String(g.waterMl)
				});
			}
		});
	}, [day]);
	if (!home) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Boot, {});
	if (!home.profile) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/comecar" });
	const minor = home.profile.age != null && home.profile.age < 18 || Boolean(home.goals?.qualitative);
	const estimate = estimateGoals(toProfilePayload(form, true));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Shell, {
		title: "Sua conta",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-3xl font-medium",
					children: "Perfil"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileFields, {
					value: form,
					onChange: setForm
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "mt-4 w-full",
					onClick: () => void saveProfile({ data: toProfilePayload(form, false) }).then((result) => toast[result.ok ? "success" : "error"](result.ok ? "Perfil atualizado." : result.error)).catch((error) => toast.error(friendlyError(error))),
					children: "Salvar perfil"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl font-medium",
						children: minor ? "Acompanhamento" : "Referência diária estimada"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: estimate.note
					}),
					minor ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 text-sm",
						children: [
							"Hidratação de referência: ",
							estimate.targets.waterMl,
							" ml. Sem número de calorias como meta."
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 grid grid-cols-2 gap-3",
						children: [
							["calories", "Calorias"],
							["protein", "Proteína (g)"],
							["carbohydrates", "Carboidratos (g)"],
							["fat", "Gorduras (g)"],
							["fiber", "Fibras (g)"],
							["waterMl", "Água (ml)"]
						].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: controlClass,
								inputMode: "decimal",
								value: goals[key],
								onChange: (e) => setGoals({
									...goals,
									[key]: e.target.value
								})
							})
						}, key))
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "secondary",
							className: "flex-1",
							onClick: () => void saveProfile({ data: toProfilePayload(form, true) }).then(async (result) => {
								if (!result.ok) toast.error(result.error);
								else {
									const fresh = await getHome({ data: { day } });
									if (fresh.ok && fresh.data.goals) {
										const g = fresh.data.goals;
										setGoals({
											calories: String(g.calories),
											protein: String(g.protein),
											carbohydrates: String(g.carbohydrates),
											fat: String(g.fat),
											fiber: String(g.fiber),
											waterMl: String(g.waterMl)
										});
									}
									toast.success("Referência atualizada.");
								}
							}),
							children: "Reestimar"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							className: "flex-1",
							onClick: () => void saveGoals({ data: {
								calories: Number(goals.calories),
								protein: Number(goals.protein),
								carbohydrates: Number(goals.carbohydrates),
								fat: Number(goals.fat),
								fiber: Number(goals.fiber),
								waterMl: Number(goals.waterMl)
							} }).then((result) => toast[result.ok ? "success" : "error"](result.ok ? "Referência salva por você." : result.error)),
							children: "Salvar referência"
						})]
					})] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl font-medium",
						children: "Memória"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Só entra o que você escrever. Visível, editável e apagável."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-3 space-y-2",
						children: home.memory.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-start justify-between gap-3 rounded-2xl border border-border px-3 py-3 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.fact }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "shrink-0 text-danger",
								onClick: () => void deleteMemory({ data: item.id }).then(() => setHome({
									...home,
									memory: home.memory.filter((m) => m.id !== item.id)
								})),
								children: "Apagar"
							})]
						}, item.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "mt-3 flex gap-2",
						onSubmit: (event) => {
							event.preventDefault();
							addMemory({ data: fact }).then((result) => {
								if (!result.ok) toast.error(result.error);
								else {
									setHome({
										...home,
										memory: [{
											id: result.data.id,
											fact
										}, ...home.memory]
									});
									setFact("");
								}
							});
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: controlClass,
							value: fact,
							onChange: (e) => setFact(e.target.value),
							placeholder: "Prefere café da manhã simples"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							className: "shrink-0",
							children: "Guardar"
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl font-medium",
						children: "Notificações"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Lembretes discretos só com o app aberto. Dá para desligar tudo."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "mt-3 flex items-center justify-between rounded-2xl border border-border px-4 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Lembretes" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: home.notifications,
							onChange: (e) => void setNotifications({ data: e.target.checked }).then((result) => {
								if (result.ok) setHome({
									...home,
									notifications: result.data.enabled
								});
							})
						})]
					}),
					home.notifications && !home.meals.some((m) => m.mealType === "lunch") && (/* @__PURE__ */ new Date()).getHours() >= 11 && (/* @__PURE__ */ new Date()).getHours() <= 14 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm",
						children: "Quer registrar seu almoço?"
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl font-medium",
						children: "Plano"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-sm leading-6",
						children: [
							"Gratuito: diário, registro manual e ",
							home.usage.limits.image,
							" análises de foto por dia. Premium, quando a cobrança existir: mais análises, coach e histórico longo. Não há pagamento nesta versão."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-sm text-muted",
						children: [
							"Seu plano agora: ",
							home.profile.plan === "premium" ? "Premium" : "Gratuito",
							"."
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl font-medium",
						children: "Um olhar da Calu"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "secondary",
						className: "mt-3 w-full",
						onClick: () => void askInsight({ data: { day } }).then((result) => {
							if (!result.ok) toast.error(result.error);
							else setInsight(result.data.insight);
						}),
						children: "Pedir um insight do dia"
					}),
					insight ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm leading-6",
						children: insight
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-10 space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl font-medium",
						children: "Seus dados"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "secondary",
						className: "w-full",
						onClick: () => void exportData().then((result) => {
							if (!result.ok) {
								toast.error(result.error);
								return;
							}
							const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
							const url = URL.createObjectURL(blob);
							const a = document.createElement("a");
							a.href = url;
							a.download = "calu-dados.json";
							a.click();
							URL.revokeObjectURL(url);
						}).catch((error) => toast.error(friendlyError(error))),
						children: "Exportar dados"
					}),
					confirm === "history" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "danger",
						className: "w-full",
						onClick: () => void deleteHistory().then((result) => {
							if (!result.ok) toast.error(result.error);
							else {
								toast.success("Histórico apagado.");
								setConfirm(null);
							}
						}),
						children: "Apagar histórico agora"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						className: "w-full",
						onClick: () => setConfirm("history"),
						children: "Excluir histórico alimentar"
					}),
					confirm === "data" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "danger",
						className: "w-full",
						onClick: () => void deleteAccountData().then((result) => {
							if (!result.ok) toast.error(result.error);
							else {
								toast.success("Dados apagados. A conta de acesso continua.");
								setConfirm(null);
								navigate({ to: "/comecar" });
							}
						}),
						children: "Apagar meus dados agora"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						className: "w-full",
						onClick: () => setConfirm("data"),
						children: "Apagar meus dados"
					}),
					confirm === "account" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "danger",
						className: "w-full",
						onClick: () => void deleteAccount().then(async (result) => {
							if (!result.ok) toast.error(result.error);
							else await signOut("/login");
						}),
						children: "Excluir minha conta agora"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						className: "w-full",
						onClick: () => setConfirm("account"),
						children: "Excluir minha conta"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-subtle",
						children: "Apagar meus dados remove diário, perfil nutricional, memória e conversas, e mantém o login. Excluir a conta também remove a identidade de acesso neste aplicativo."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/privacidade",
								className: "underline",
								children: "Política de Privacidade"
							}),
							" · ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/termos",
								className: "underline",
								children: "Termos de Uso"
							})
						]
					})
				]
			})
		]
	});
}
//#endregion
export { ProfilePage as component };
