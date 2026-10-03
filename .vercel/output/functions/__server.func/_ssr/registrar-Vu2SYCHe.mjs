import { o as __toESM } from "../_runtime.mjs";
import { C as useNavigate, Q as require_react, T as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { D as quantityStep, M as sumFoods, P as withQuantity, b as mealLabel, c as MEAL_TYPES, f as commitDraft, g as formatQty, h as fold, l as UNITS, v as macroLine, y as makeFood } from "./validation-D7j3wXdT.mjs";
import { i as calculateNutrition, n as TACO_SOURCE, o as nutritionSourceLabel, r as applyPortionPreset, t as TACO_FOODS } from "./pipeline-B2RyjoBE.mjs";
import { compressImage, enqueueMeal, friendlyError, isOfflineError, todayKey } from "./client-BomANk9E.mjs";
import { n as useCurrentUserState } from "./use-current-user-C6j3ciP_.mjs";
import { a as analyzeText, i as analyzePhoto, v as lookupBarcode, x as saveMeal } from "./api-BgGs2_Z7.mjs";
import { i as Trash2, l as Minus, s as Plus } from "../_libs/lucide-react.mjs";
import { c as controlClass, n as Button, o as Screen } from "./chrome-BdSW11gm.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as Route$2 } from "./router-Cm7k6Ped.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/registrar-Vu2SYCHe.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function searchTaco(query) {
	const q = fold(query.trim());
	if (q.length < 2) return [];
	return TACO_FOODS.filter((food) => fold(food.name).includes(q) || food.aliases.some((alias) => fold(alias).includes(q))).slice(0, 12);
}
function foodFromTaco(food, quantity, unit) {
	const weightUnits = unit === "g" || unit === "kg" || food.liquid && (unit === "ml" || unit === "L");
	if (!weightUnits || food.kcal == null) return {
		note: weightUnits ? "Dados não disponíveis na referência para este item." : "Sem equivalência em gramas para essa unidade. Informe o peso em gramas para usar a referência TACO, ou peça uma estimativa.",
		draft: makeFood({
			id: crypto.randomUUID(),
			name: food.name,
			quantity: quantity || 1,
			unit,
			calories: null,
			protein: null,
			carbohydrates: null,
			fat: null,
			fiber: null,
			source: "taco",
			dataStatus: "unavailable"
		})
	};
	const grams = unit === "kg" || unit === "L" ? quantity * 1e3 : quantity;
	if (!(grams > 0)) return {
		note: "Informe uma quantidade maior que zero para calcular a referência.",
		draft: makeFood({
			id: crypto.randomUUID(),
			name: food.name,
			quantity: 1,
			unit,
			calories: null,
			protein: null,
			carbohydrates: null,
			fat: null,
			fiber: null,
			source: "taco",
			dataStatus: "unavailable"
		})
	};
	const scaled = calculateNutrition({
		calories: food.kcal,
		protein: food.protein,
		carbohydrates: food.carbs,
		fat: food.fat,
		fiber: food.fiber
	}, grams);
	const draft = makeFood({
		id: crypto.randomUUID(),
		name: food.name,
		quantity,
		unit,
		calories: scaled.calories,
		protein: scaled.protein,
		carbohydrates: scaled.carbohydrates,
		fat: scaled.fat,
		fiber: scaled.fiber,
		source: "taco",
		dataStatus: "reference"
	});
	draft.nutritionSource = "TACO";
	draft.nutritionConfidence = .99;
	return {
		note: food.liquid && (unit === "ml" || unit === "L") ? `Referência ${TACO_SOURCE}, por 100 g. Para líquido, 1 ml foi tratado como 1 g — uma aproximação.` : `Referência ${TACO_SOURCE}, por 100 g. A porção é a que você informou.`,
		draft
	};
}
function MealEditor({ foods, mealType, onFoods, onMealType, uncertainties }) {
	const totals = sumFoods(foods);
	const update = (id, next) => onFoods(foods.map((food) => food.id === id ? next : food));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Tipo de refeição"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 flex gap-2 overflow-x-auto pb-1",
				children: MEAL_TYPES.map((type) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => onMealType(type.id),
					className: type.id === mealType ? "h-10 shrink-0 rounded-full bg-primary px-3 text-sm text-primary-foreground" : "h-10 shrink-0 rounded-full border border-border bg-card px-3 text-sm",
					children: type.label
				}, type.id))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-3",
				children: foods.map((food) => {
					const step = quantityStep(food.unit);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "rounded-3xl border border-border bg-card p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "font-medium",
										children: food.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-sm text-muted",
										children: [
											nutritionSourceLabel(food.nutritionSource, food.dataStatus),
											food.review === "high" ? " · Identificação com alta confiança." : "",
											food.review === "medium" ? " · Quantidade estimada." : "",
											food.review === "low" ? " · Preciso confirmar uma informação." : ""
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": `Remover ${food.name}`,
									className: "press grid size-11 place-items-center rounded-lg text-danger",
									onClick: () => onFoods(foods.filter((item) => item.id !== food.id)),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 flex items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": "Diminuir quantidade",
										className: "press grid size-11 place-items-center rounded-lg border border-border",
										onClick: () => update(food.id, withQuantity(food, food.quantity - step)),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "size-4" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "sr-only",
											children: ["Quantidade de ", food.name]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											inputMode: "decimal",
											className: controlClass + " text-center tabular-nums",
											value: String(food.quantity),
											onChange: (event) => {
												const next = Number(event.target.value.replace(",", "."));
												if (Number.isFinite(next)) update(food.id, withQuantity(food, next));
											}
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": "Aumentar quantidade",
										className: "press grid size-11 place-items-center rounded-lg border border-border",
										onClick: () => update(food.id, withQuantity(food, food.quantity + step)),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" })
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "mt-2 block",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "sr-only",
									children: "Unidade"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									className: controlClass,
									value: food.unit,
									onChange: (event) => update(food.id, commitDraft({
										...food,
										unit: event.target.value
									})),
									children: UNITS.map((unit) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: unit,
										children: unit
									}, unit))
								})]
							}),
							food.review === "low" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-muted",
										children: "Acho que a porção pode variar. Você confirma?"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mt-2 flex flex-wrap gap-2",
										children: [
											["pequena", "Pequena"],
											["media", "Média"],
											["grande", "Grande"]
										].map(([preset, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "h-10 rounded-full border border-border px-3 text-sm",
											onClick: () => update(food.id, applyPortionPreset(food, preset)),
											children: label
										}, preset))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-2 text-xs text-subtle",
										children: "Ou informe a quantidade no campo acima."
									})
								]
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-3 text-sm tabular-nums text-muted",
								children: [
									food.dataStatus === "estimate" || food.nutritionSource === "AI_ESTIMATE" ? "~" : "",
									macroLine(food.calories, "kcal"),
									" · P ",
									macroLine(food.protein, "g"),
									" · C",
									" ",
									macroLine(food.carbohydrates, "g"),
									" · G ",
									macroLine(food.fat, "g")
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm tabular-nums text-subtle",
								children: ["Fibras ", macroLine(food.fiber, "g")]
							})
						]
					}, food.id);
				})
			}),
			uncertainties.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-1 text-sm text-muted",
				children: uncertainties.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: item }, item))
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-3xl bg-foreground px-4 py-4 text-background",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-background/70",
						children: mealLabel(mealType)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 font-display text-3xl tabular-nums",
						children: [
							"~",
							totals.calories,
							" kcal"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm text-background/80",
						children: [
							"Proteína ",
							macroLine(totals.incomplete && totals.protein === 0 ? null : totals.protein, "g"),
							" · Carboidrato",
							" ",
							totals.carbohydrates,
							" g · Gordura ",
							totals.fat,
							" g · Fibras ",
							totals.fiber,
							" g"
						]
					}),
					totals.incomplete ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-background/70",
						children: "O total é parcial: algum item está sem dados completos."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-background/70",
						children: "Estimativa, não um valor exato."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Confira as quantidades antes de salvar. Você pode corrigir agora."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "sr-only",
				children: foods.map((food) => formatQty(food.quantity, food.unit)).join(", ")
			})
		]
	});
}
function AddFoodRow({ onAdd }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
		variant: "secondary",
		className: "w-full",
		onClick: () => onAdd(commitDraft({
			id: crypto.randomUUID(),
			name: "Novo alimento",
			quantity: 1,
			unit: "porção",
			calories: null,
			protein: null,
			carbohydrates: null,
			fat: null,
			fiber: null,
			confidence: null,
			source: "user",
			dataStatus: "unavailable",
			baseQuantity: 1,
			baseCalories: null,
			baseProtein: null,
			baseCarbohydrates: null,
			baseFat: null,
			baseFiber: null
		})),
		children: "Adicionar alimento"
	});
}
function RegisterPage() {
	const { modo, id } = Route$2.useSearch();
	const { user } = useCurrentUserState();
	const navigate = useNavigate();
	const cameraRef = (0, import_react.useRef)(null);
	const galleryRef = (0, import_react.useRef)(null);
	const [phase, setPhase] = (0, import_react.useState)("capture");
	const [preview, setPreview] = (0, import_react.useState)("");
	const [image, setImage] = (0, import_react.useState)("");
	const [text, setText] = (0, import_react.useState)("");
	const [listening, setListening] = (0, import_react.useState)(false);
	const [query, setQuery] = (0, import_react.useState)("");
	const [code, setCode] = (0, import_react.useState)("");
	const [foods, setFoods] = (0, import_react.useState)([]);
	const [mealType, setMealType] = (0, import_react.useState)("lunch");
	const [uncertainties, setUncertainties] = (0, import_react.useState)([]);
	const [insight, setInsight] = (0, import_react.useState)("");
	const [source, setSource] = (0, import_react.useState)(modo === "voz" ? "voice" : modo === "texto" ? "text" : modo === "busca" ? "search" : modo === "codigo" ? "barcode" : "photo");
	const [offlineNote, setOfflineNote] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (modo !== "editar" || !id) return;
		const raw = sessionStorage.getItem("calu.edit");
		if (!raw) return;
		const meal = JSON.parse(raw);
		if (meal.id !== id) return;
		setFoods(meal.foods);
		setMealType(meal.mealType);
		setUncertainties(meal.uncertainties ?? []);
		setInsight(meal.insight ?? "");
		setSource(meal.source);
		setPhase("review");
	}, [modo, id]);
	function applyAnalysis(analysis, nextSource) {
		setFoods(analysis.foods);
		setMealType(analysis.mealType);
		setUncertainties(analysis.uncertainties);
		setInsight(analysis.insight);
		setSource(nextSource);
		setPhase(analysis.foods.length ? "review" : "capture");
		if (!analysis.foods.length) toast.error("Não identifiquei alimentos com segurança. Descreva a refeição ou adicione manualmente.");
	}
	async function onFile(file) {
		if (!file) return;
		try {
			const base64 = await compressImage(file);
			setImage(base64);
			setPreview(`data:image/jpeg;base64,${base64}`);
		} catch (error) {
			toast.error(friendlyError(error));
		}
	}
	async function runPhoto() {
		if (!image) return;
		if (!navigator.onLine) {
			toast.error("A análise por foto precisa de conexão.");
			return;
		}
		setPhase("analyzing");
		setBusy(true);
		try {
			const hour = (/* @__PURE__ */ new Date()).getHours();
			const result = await analyzePhoto({ data: {
				imageBase64: image,
				hour,
				day: todayKey(),
				hint: `Horário local aproximado: ${hour}h.`
			} });
			if (!result.ok) {
				toast.error(result.error);
				setPhase("capture");
				return;
			}
			applyAnalysis(result.data.analysis, "photo");
		} catch (error) {
			toast.error(friendlyError(error));
			setPhase("capture");
		} finally {
			setBusy(false);
		}
	}
	async function runText(kind) {
		if (text.trim().length < 2) return;
		if (!navigator.onLine) {
			toast.error("A interpretação por IA precisa de conexão. Você ainda pode buscar um alimento da referência.");
			return;
		}
		setPhase("analyzing");
		setBusy(true);
		try {
			const hour = (/* @__PURE__ */ new Date()).getHours();
			const result = await analyzeText({ data: {
				text,
				source: kind,
				hour,
				day: todayKey(),
				hint: `Horário local aproximado: ${hour}h.`
			} });
			if (!result.ok) {
				toast.error(result.error);
				setPhase("capture");
				return;
			}
			applyAnalysis(result.data.analysis, kind === "voice" ? "voice" : "text");
		} catch (error) {
			toast.error(friendlyError(error));
			setPhase("capture");
		} finally {
			setBusy(false);
		}
	}
	function speak() {
		const w = window;
		const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
		if (!Ctor) {
			toast.error("Este navegador não transcreve voz. Você pode digitar o que falaria.");
			return;
		}
		const rec = new Ctor();
		rec.lang = "pt-BR";
		rec.interimResults = false;
		rec.onresult = (event) => {
			const said = event.results[0]?.[0]?.transcript ?? "";
			setText(said);
			setListening(false);
		};
		rec.onerror = () => {
			setListening(false);
			toast.error("Não consegui ouvir. Tente de novo ou escreva.");
		};
		rec.onend = () => setListening(false);
		setListening(true);
		rec.start();
	}
	async function scanCode(value) {
		const clean = value.replace(/\D/g, "");
		if (clean.length < 8) {
			toast.error("Informe o código numérico.");
			return;
		}
		setBusy(true);
		try {
			const result = await lookupBarcode({ data: clean });
			if (!result.ok) {
				toast.error(result.error === "Produto não encontrado." ? "Produto não encontrado. Cadastre manualmente." : result.error);
				return;
			}
			const item = result.data;
			const draft = makeFood({
				id: crypto.randomUUID(),
				name: item.name,
				quantity: item.quantity,
				unit: item.unit,
				calories: item.calories,
				protein: item.protein,
				carbohydrates: item.carbohydrates,
				fat: item.fat,
				fiber: item.fiber,
				source: "barcode",
				dataStatus: item.completeness === "unavailable" ? "unavailable" : "reference"
			});
			draft.nutritionSource = "OPEN_FOOD_FACTS";
			draft.nutritionConfidence = item.completeness === "complete" ? .9 : item.completeness === "partial" ? .55 : 0;
			setFoods([draft]);
			setUncertainties([item.note]);
			setSource("barcode");
			setMealType(guessMeal());
			setPhase("review");
		} catch (error) {
			toast.error(friendlyError(error));
		} finally {
			setBusy(false);
		}
	}
	async function confirm() {
		if (!foods.length || foods.some((food) => !food.name.trim() || food.quantity <= 0)) {
			toast.error("Confira nome e quantidade de cada alimento.");
			return;
		}
		const payload = {
			id: id || crypto.randomUUID(),
			day: todayKey(),
			mealType,
			eatenAt: (/* @__PURE__ */ new Date()).toISOString(),
			source,
			note: "",
			uncertainties,
			insight,
			foods
		};
		setBusy(true);
		try {
			const result = await saveMeal({ data: payload });
			if (!result.ok) {
				toast.error(result.error);
				return;
			}
			setPhase("saved");
		} catch (error) {
			if (isOfflineError(error)) {
				enqueueMeal(user?.id ?? "local", payload);
				setOfflineNote("Salvo neste aparelho. Sincroniza quando a internet voltar.");
				setPhase("saved");
			} else toast.error(friendlyError(error));
		} finally {
			setBusy(false);
		}
	}
	const hits = searchTaco(query);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Screen, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "text-sm text-muted",
			onClick: () => navigate({ to: "/" }),
			children: "Voltar"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "mt-4 font-display text-3xl font-medium tracking-tight",
			children: phase === "analyzing" ? "Analisando" : phase === "review" ? "Confira sua refeição" : phase === "saved" ? "Registrado" : modo === "voz" ? "Falar refeição" : modo === "texto" ? "O que você comeu?" : modo === "busca" ? "Buscar alimento" : modo === "codigo" ? "Código de barras" : "Fotografar refeição"
		}),
		phase === "analyzing" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-16",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-1 overflow-hidden rounded-full bg-border",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pulse-line h-full origin-left bg-primary" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-lg",
					children: "Analisando sua refeição..."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "Isso é uma estimativa, não uma pesagem."
				})
			]
		}) : null,
		phase === "capture" && (modo === "foto" || modo === "photo") ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6 space-y-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted",
					children: "A foto não fica armazenada. Ela segue só para a estimativa e depois é descartada."
				}),
				preview ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: preview,
					alt: "Prévia da refeição",
					className: "w-full rounded-3xl object-cover"
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					ref: cameraRef,
					type: "file",
					accept: "image/*",
					capture: "environment",
					className: "hidden",
					onChange: (e) => void onFile(e.target.files?.[0])
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					ref: galleryRef,
					type: "file",
					accept: "image/*",
					className: "hidden",
					onChange: (e) => void onFile(e.target.files?.[0])
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "w-full",
					onClick: () => cameraRef.current?.click(),
					children: "Tirar foto"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					className: "w-full",
					onClick: () => galleryRef.current?.click(),
					children: "Escolher da galeria"
				}),
				preview ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "w-full",
					disabled: busy,
					onClick: () => void runPhoto(),
					children: "Analisar com IA"
				}) : null
			]
		}) : null,
		phase === "capture" && modo === "texto" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "mt-6 space-y-3",
			onSubmit: (event) => {
				event.preventDefault();
				runText("text");
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
				className: controlClass + " h-36 py-3",
				placeholder: "Comi 2 ovos, duas fatias de pão e uma banana.",
				value: text,
				onChange: (e) => setText(e.target.value)
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				className: "w-full",
				disabled: busy,
				children: "Interpretar"
			})]
		}) : null,
		phase === "capture" && modo === "voz" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6 space-y-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "w-full",
					onClick: speak,
					children: listening ? "Ouvindo..." : "Falar refeição"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					className: controlClass + " h-32 py-3",
					value: text,
					onChange: (e) => setText(e.target.value),
					placeholder: "A transcrição aparece aqui. Você pode editar."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "w-full",
					disabled: busy || text.trim().length < 2,
					onClick: () => void runText("voice"),
					children: "Interpretar"
				})
			]
		}) : null,
		phase === "capture" && modo === "busca" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: controlClass,
					value: query,
					onChange: (e) => setQuery(e.target.value),
					placeholder: "Arroz, feijão, tapioca..."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 space-y-2",
					children: hits.map((food) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "w-full rounded-2xl border border-border bg-card px-4 py-3 text-left",
						onClick: () => {
							const built = foodFromTaco(food, 100, "g");
							setFoods([built.draft]);
							setUncertainties(built.note ? [built.note] : []);
							setSource("search");
							setMealType(guessMeal());
							setPhase("review");
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium",
							children: food.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-1 block text-sm text-muted",
							children: food.kcal == null ? "Dados não disponíveis" : `${food.kcal} kcal / 100 g · ${food.category}`
						})]
					}) }, food.id))
				}),
				query.trim().length >= 2 && hits.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 space-y-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Não está na referência TACO deste app. Posso estimar pelo texto, se você confirmar depois."
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "secondary",
						className: "w-full",
						onClick: () => {
							setText(query);
							runText("text");
						},
						children: "Estimar com a Calu"
					})]
				}) : null
			]
		}) : null,
		phase === "capture" && modo === "codigo" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "mt-6 space-y-3",
			onSubmit: (event) => {
				event.preventDefault();
				scanCode(code);
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted",
					children: "Aponte a câmera se o navegador permitir, ou digite o código. Se não acharmos o produto, você cadastra na hora."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: controlClass,
					inputMode: "numeric",
					value: code,
					onChange: (e) => setCode(e.target.value),
					placeholder: "789..."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					className: "w-full",
					disabled: busy,
					children: "Buscar produto"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					className: "w-full",
					onClick: () => {
						setFoods([makeFood({
							id: crypto.randomUUID(),
							name: "Produto",
							quantity: 1,
							unit: "porção",
							calories: null,
							protein: null,
							carbohydrates: null,
							fat: null,
							fiber: null,
							source: "user",
							dataStatus: "unavailable"
						})]);
						setUncertainties(["Cadastro manual. Dados não disponíveis até você completar."]);
						setSource("manual");
						setPhase("review");
					},
					children: "Cadastrar manualmente"
				})
			]
		}) : null,
		phase === "review" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6 space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted",
					children: source === "photo" || source === "text" || source === "voice" ? "Encontrei aproximadamente..." : "Ajuste antes de salvar."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MealEditor, {
					foods,
					mealType,
					onFoods: setFoods,
					onMealType: setMealType,
					uncertainties
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AddFoodRow, { onAdd: (food) => setFoods([...foods, food]) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "w-full",
					disabled: busy,
					onClick: () => void confirm(),
					children: busy ? "Salvando" : "Confirmar refeição"
				})
			]
		}) : null,
		phase === "saved" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rise mt-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-lg",
					children: offlineNote || "A refeição entrou no seu dia."
				}),
				insight ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 rounded-3xl bg-card p-4 text-sm leading-6",
					children: insight
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted",
					children: "Estimativa confirmada por você. O total do dia já considera este registro quando houver conexão."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "mt-6 w-full",
					onClick: () => navigate({ to: "/" }),
					children: "Ver o dia"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					className: "mt-3 w-full",
					onClick: () => navigate({ to: "/diario" }),
					children: "Abrir diário"
				})
			]
		}) : null
	] });
}
function guessMeal() {
	const hour = (/* @__PURE__ */ new Date()).getHours();
	if (hour < 10) return "breakfast";
	if (hour < 15) return "lunch";
	if (hour < 18) return "snack";
	if (hour < 22) return "dinner";
	return "supper";
}
//#endregion
export { RegisterPage as component };
