import { o as __toESM } from "../_runtime.mjs";
import { C as useNavigate, Q as require_react, T as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as round1, D as withQuantity, T as sumFoods, _ as makeFood, g as macroLine, m as formatQty, o as MEAL_TYPES, p as fold, s as UNITS, u as commitDraft, v as mealLabel, x as quantityStep } from "./middleware-DXgQgsCD.mjs";
import { E as saveMeal, M as todayKey, g as friendlyError, i as analyzeText, m as enqueueMeal, r as analyzePhoto, s as compressImage, x as lookupBarcode, y as isOfflineError } from "./client-CNxcQzpI.mjs";
import { i as Trash2, l as Minus, s as Plus } from "../_libs/lucide-react.mjs";
import { c as controlClass, n as Button, o as Screen } from "./chrome-BdSW11gm.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as Route$2 } from "./router-BW7X0Qi2.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/registrar-D3FnG4qy.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var TACO_SOURCE = "TACO 4ª edição, NEPA/UNICAMP";
var TACO_FOODS = [
	{
		"id": 163,
		"name": "Abacate, cru",
		"category": "Frutas e derivados",
		"kcal": 96,
		"protein": 1.2,
		"carbs": 6,
		"fat": 8.4,
		"fiber": 6.3,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 164,
		"name": "Abacaxi, cru",
		"category": "Frutas e derivados",
		"kcal": 48,
		"protein": .9,
		"carbs": 12.3,
		"fat": .1,
		"fiber": 1,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 70,
		"name": "Abobrinha, italiana, cozida",
		"category": "Verduras, hortaliças e derivados",
		"kcal": 15,
		"protein": 1.1,
		"carbs": 3,
		"fat": .2,
		"fiber": 1.6,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 78,
		"name": "Alface, crespa, crua",
		"category": "Verduras, hortaliças e derivados",
		"kcal": 11,
		"protein": 1.3,
		"carbs": 1.7,
		"fat": .2,
		"fiber": 1.8,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 1,
		"name": "Arroz, integral, cozido",
		"category": "Cereais e derivados",
		"kcal": 124,
		"protein": 2.6,
		"carbs": 25.8,
		"fat": 1,
		"fiber": 2.7,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 3,
		"name": "Arroz, tipo 1, cozido",
		"category": "Cereais e derivados",
		"kcal": 128,
		"protein": 2.5,
		"carbs": 28.1,
		"fat": .2,
		"fiber": 1.6,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 277,
		"name": "Atum, conserva em óleo",
		"category": "Pescados e frutos do mar",
		"kcal": 166,
		"protein": 26.2,
		"carbs": 0,
		"fat": 6,
		"fiber": null,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 7,
		"name": "Aveia, flocos, crua",
		"category": "Cereais e derivados",
		"kcal": 394,
		"protein": 13.9,
		"carbs": 66.6,
		"fat": 8.5,
		"fiber": 9.1,
		"liquid": false,
		"aliases": ["aveia"]
	},
	{
		"id": 260,
		"name": "Azeite, de oliva, extra virgem",
		"category": "Gorduras e óleos",
		"kcal": 884,
		"protein": null,
		"carbs": null,
		"fat": 100,
		"fiber": null,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 167,
		"name": "Açaí, polpa, com xarope de guaraná e glucose",
		"category": "Frutas e derivados",
		"kcal": 110,
		"protein": .7,
		"carbs": 21.5,
		"fat": 3.7,
		"fiber": 1.7,
		"liquid": true,
		"aliases": ["acai", "açaí"]
	},
	{
		"id": 168,
		"name": "Açaí, polpa, congelada",
		"category": "Frutas e derivados",
		"kcal": 58,
		"protein": .8,
		"carbs": 6.2,
		"fat": 3.9,
		"fiber": 2.6,
		"liquid": true,
		"aliases": ["acai", "açaí"]
	},
	{
		"id": 494,
		"name": "Açúcar, refinado",
		"category": "Produtos açucarados",
		"kcal": 387,
		"protein": .3,
		"carbs": 99.5,
		"fat": 0,
		"fiber": null,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 179,
		"name": "Banana, nanica, crua",
		"category": "Frutas e derivados",
		"kcal": 92,
		"protein": 1.4,
		"carbs": 23.8,
		"fat": .1,
		"fiber": 1.9,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 182,
		"name": "Banana, prata, crua",
		"category": "Frutas e derivados",
		"kcal": 98,
		"protein": 1.3,
		"carbs": 26,
		"fat": .1,
		"fiber": 2,
		"liquid": false,
		"aliases": ["banana"]
	},
	{
		"id": 86,
		"name": "Batata, baroa, cozida",
		"category": "Verduras, hortaliças e derivados",
		"kcal": 80,
		"protein": .9,
		"carbs": 18.9,
		"fat": .2,
		"fiber": 1.8,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 88,
		"name": "Batata, doce, cozida",
		"category": "Verduras, hortaliças e derivados",
		"kcal": 77,
		"protein": .6,
		"carbs": 18.4,
		"fat": .1,
		"fiber": 2.2,
		"liquid": false,
		"aliases": ["batata doce"]
	},
	{
		"id": 91,
		"name": "Batata, inglesa, cozida",
		"category": "Verduras, hortaliças e derivados",
		"kcal": 52,
		"protein": 1.2,
		"carbs": 11.9,
		"fat": 0,
		"fiber": 1.3,
		"liquid": false,
		"aliases": ["batata"]
	},
	{
		"id": 93,
		"name": "Batata, inglesa, frita",
		"category": "Verduras, hortaliças e derivados",
		"kcal": 267,
		"protein": 5,
		"carbs": 35.6,
		"fat": 13.1,
		"fiber": 8.1,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 97,
		"name": "Beterraba, cozida",
		"category": "Verduras, hortaliças e derivados",
		"kcal": 32,
		"protein": 1.3,
		"carbs": 7.2,
		"fat": .1,
		"fiber": 1.9,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 100,
		"name": "Brócolis, cozido",
		"category": "Verduras, hortaliças e derivados",
		"kcal": 25,
		"protein": 2.1,
		"carbs": 4.4,
		"fat": .5,
		"fiber": 3.4,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 471,
		"name": "Café, infusão 10%",
		"category": "Bebidas (alcoólicas e não alcoólicas)",
		"kcal": 9,
		"protein": .7,
		"carbs": 1.5,
		"fat": .1,
		"fiber": null,
		"liquid": true,
		"aliases": ["cafe", "café"]
	},
	{
		"id": 338,
		"name": "Carne, bovina, charque, cozido",
		"category": "Carnes e derivados",
		"kcal": 263,
		"protein": 36.4,
		"carbs": 0,
		"fat": 11.9,
		"fiber": null,
		"liquid": false,
		"aliases": [
			"carne de sol",
			"jaba",
			"charque"
		]
	},
	{
		"id": 377,
		"name": "Carne, bovina, patinho, sem gordura, grelhado",
		"category": "Carnes e derivados",
		"kcal": 219,
		"protein": 35.9,
		"carbs": 0,
		"fat": 7.3,
		"fiber": null,
		"liquid": false,
		"aliases": [
			"patinho",
			"carne bovina",
			"bife"
		]
	},
	{
		"id": 109,
		"name": "Cenoura, cozida",
		"category": "Verduras, hortaliças e derivados",
		"kcal": 30,
		"protein": .8,
		"carbs": 6.7,
		"fat": .2,
		"fiber": 2.6,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 116,
		"name": "Couve, manteiga, refogada",
		"category": "Verduras, hortaliças e derivados",
		"kcal": 90,
		"protein": 1.7,
		"carbs": 8.7,
		"fat": 6.6,
		"fiber": 5.7,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 533,
		"name": "Cuscuz, de milho, cozido com sal",
		"category": "Alimentos preparados",
		"kcal": 113,
		"protein": 2.2,
		"carbs": 25.3,
		"fat": .7,
		"fiber": 2.1,
		"liquid": false,
		"aliases": ["cuscuz"]
	},
	{
		"id": 561,
		"name": "Feijão, carioca, cozido",
		"category": "Leguminosas e derivados",
		"kcal": 76,
		"protein": 4.8,
		"carbs": 13.6,
		"fat": .5,
		"fiber": 8.5,
		"liquid": false,
		"aliases": ["feijao", "feijão"]
	},
	{
		"id": 567,
		"name": "Feijão, preto, cozido",
		"category": "Leguminosas e derivados",
		"kcal": 77,
		"protein": 4.5,
		"carbs": 14,
		"fat": .5,
		"fiber": 8.4,
		"liquid": false,
		"aliases": ["feijao preto", "feijão preto"]
	},
	{
		"id": 410,
		"name": "Frango, peito, sem pele, grelhado",
		"category": "Carnes e derivados",
		"kcal": 159,
		"protein": 32,
		"carbs": 0,
		"fat": 2.5,
		"fiber": null,
		"liquid": false,
		"aliases": ["frango", "peito de frango"]
	},
	{
		"id": 200,
		"name": "Goiaba, vermelha, com casca, crua",
		"category": "Frutas e derivados",
		"kcal": 54,
		"protein": 1.1,
		"carbs": 13,
		"fat": .4,
		"fiber": 6.2,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 415,
		"name": "Hambúrguer, bovino, cru",
		"category": "Carnes e derivados",
		"kcal": 215,
		"protein": 13.2,
		"carbs": 4.2,
		"fat": 16.2,
		"fiber": null,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 416,
		"name": "Hambúrguer, bovino, frito",
		"category": "Carnes e derivados",
		"kcal": 258,
		"protein": 20,
		"carbs": 6.3,
		"fat": 17,
		"fiber": null,
		"liquid": false,
		"aliases": ["hamburguer", "hambúrguer"]
	},
	{
		"id": 448,
		"name": "Iogurte, natural",
		"category": "Leite e derivados",
		"kcal": 51,
		"protein": 4.1,
		"carbs": 1.9,
		"fat": 3,
		"fiber": null,
		"liquid": true,
		"aliases": []
	},
	{
		"id": 450,
		"name": "Iogurte, sabor abacaxi",
		"category": "Leite e derivados",
		"kcal": null,
		"protein": null,
		"carbs": null,
		"fat": null,
		"fiber": null,
		"liquid": true,
		"aliases": []
	},
	{
		"id": 208,
		"name": "Laranja, baía, crua",
		"category": "Frutas e derivados",
		"kcal": 45,
		"protein": 1,
		"carbs": 11.5,
		"fat": .1,
		"fiber": 1.1,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 523,
		"name": "Leite, de coco",
		"category": "Outros alimentos industrializados",
		"kcal": 166,
		"protein": 1,
		"carbs": 2.2,
		"fat": 18.4,
		"fiber": .7,
		"liquid": true,
		"aliases": []
	},
	{
		"id": 458,
		"name": "Leite, de vaca, integral",
		"category": "Leite e derivados",
		"kcal": null,
		"protein": null,
		"carbs": null,
		"fat": null,
		"fiber": null,
		"liquid": true,
		"aliases": []
	},
	{
		"id": 577,
		"name": "Lentilha, cozida",
		"category": "Leguminosas e derivados",
		"kcal": 93,
		"protein": 6.3,
		"carbs": 16.3,
		"fat": .5,
		"fiber": 7.9,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 542,
		"name": "Macarrão, molho bolognesa",
		"category": "Alimentos preparados",
		"kcal": 120,
		"protein": 4.9,
		"carbs": 22.5,
		"fat": .9,
		"fiber": .8,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 225,
		"name": "Mamão, Formosa, cru",
		"category": "Frutas e derivados",
		"kcal": 45,
		"protein": .8,
		"carbs": 11.6,
		"fat": .1,
		"fiber": 1.8,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 129,
		"name": "Mandioca, cozida",
		"category": "Verduras, hortaliças e derivados",
		"kcal": 125,
		"protein": .6,
		"carbs": 30.1,
		"fat": .3,
		"fiber": 1.6,
		"liquid": false,
		"aliases": [
			"macaxeira",
			"aipim",
			"mandioca"
		]
	},
	{
		"id": 131,
		"name": "Mandioca, farofa, temperada",
		"category": "Verduras, hortaliças e derivados",
		"kcal": 406,
		"protein": 2.1,
		"carbs": 80.3,
		"fat": 9.1,
		"fiber": 7.8,
		"liquid": false,
		"aliases": ["farofa"]
	},
	{
		"id": 231,
		"name": "Manga, Tommy Atkins, crua",
		"category": "Frutas e derivados",
		"kcal": 51,
		"protein": .9,
		"carbs": 12.8,
		"fat": .2,
		"fiber": 2.1,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 261,
		"name": "Manteiga, com sal",
		"category": "Gorduras e óleos",
		"kcal": 726,
		"protein": .4,
		"carbs": .1,
		"fat": 82.4,
		"fiber": null,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 232,
		"name": "Maracujá, cru",
		"category": "Frutas e derivados",
		"kcal": 68,
		"protein": 2,
		"carbs": 12.3,
		"fat": 2.1,
		"fiber": 1.1,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 222,
		"name": "Maçã, Fuji, com casca, crua",
		"category": "Frutas e derivados",
		"kcal": 56,
		"protein": .3,
		"carbs": 15.2,
		"fat": 0,
		"fiber": 1.3,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 507,
		"name": "Mel, de abelha",
		"category": "Produtos açucarados",
		"kcal": 309,
		"protein": 0,
		"carbs": 84,
		"fat": 0,
		"fiber": null,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 235,
		"name": "Melancia, crua",
		"category": "Frutas e derivados",
		"kcal": 33,
		"protein": .9,
		"carbs": 8.1,
		"fat": 0,
		"fiber": .1,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 301,
		"name": "Merluza, filé, assado",
		"category": "Pescados e frutos do mar",
		"kcal": 122,
		"protein": 26.6,
		"carbs": 0,
		"fat": .9,
		"fiber": null,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 44,
		"name": "Milho, verde, cru",
		"category": "Cereais e derivados",
		"kcal": 138,
		"protein": 6.6,
		"carbs": 28.6,
		"fat": .6,
		"fiber": 3.9,
		"liquid": false,
		"aliases": ["milho"]
	},
	{
		"id": 239,
		"name": "Morango, cru",
		"category": "Frutas e derivados",
		"kcal": 30,
		"protein": .9,
		"carbs": 6.8,
		"fat": .3,
		"fiber": 1.7,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 424,
		"name": "Mortadela",
		"category": "Carnes e derivados",
		"kcal": 269,
		"protein": 12,
		"carbs": 5.8,
		"fat": 21.6,
		"fiber": null,
		"liquid": false,
		"aliases": ["mortadela"]
	},
	{
		"id": 488,
		"name": "Ovo, de galinha, inteiro, cozido/10minutos",
		"category": "Ovos e derivados",
		"kcal": 146,
		"protein": 13.3,
		"carbs": .6,
		"fat": 9.5,
		"fiber": null,
		"liquid": false,
		"aliases": ["ovo", "ovos"]
	},
	{
		"id": 142,
		"name": "Pepino, cru",
		"category": "Verduras, hortaliças e derivados",
		"kcal": 10,
		"protein": .9,
		"carbs": 2,
		"fat": 0,
		"fiber": 1.1,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 435,
		"name": "Porco, pernil, assado",
		"category": "Carnes e derivados",
		"kcal": 262,
		"protein": 32.1,
		"carbs": 0,
		"fat": 13.9,
		"fiber": null,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 439,
		"name": "Presunto, sem capa de gordura",
		"category": "Carnes e derivados",
		"kcal": 94,
		"protein": 14.3,
		"carbs": 2.1,
		"fat": 2.7,
		"fiber": null,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 140,
		"name": "Pão, de queijo, assado",
		"category": "Verduras, hortaliças e derivados",
		"kcal": 363,
		"protein": 5.1,
		"carbs": 34.2,
		"fat": 24.6,
		"fiber": .6,
		"liquid": false,
		"aliases": ["pao de queijo", "pão de queijo"]
	},
	{
		"id": 52,
		"name": "Pão, trigo, forma, integral",
		"category": "Cereais e derivados",
		"kcal": 253,
		"protein": 9.4,
		"carbs": 49.9,
		"fat": 3.7,
		"fiber": 6.9,
		"liquid": false,
		"aliases": ["pao de forma", "pão de forma"]
	},
	{
		"id": 53,
		"name": "Pão, trigo, francês",
		"category": "Cereais e derivados",
		"kcal": 300,
		"protein": 8,
		"carbs": 58.6,
		"fat": 3.1,
		"fiber": 2.3,
		"liquid": false,
		"aliases": [
			"pao frances",
			"pao francês",
			"pão francês"
		]
	},
	{
		"id": 461,
		"name": "Queijo, minas, frescal",
		"category": "Leite e derivados",
		"kcal": 264,
		"protein": 17.4,
		"carbs": 3.2,
		"fat": 20.2,
		"fiber": null,
		"liquid": false,
		"aliases": ["queijo minas", "queijo"]
	},
	{
		"id": 463,
		"name": "Queijo, mozarela",
		"category": "Leite e derivados",
		"kcal": 330,
		"protein": 22.6,
		"carbs": 3,
		"fat": 25.2,
		"fiber": null,
		"liquid": false,
		"aliases": [
			"mussarela",
			"muçarela",
			"mozarela"
		]
	},
	{
		"id": 468,
		"name": "Queijo, requeijão, cremoso",
		"category": "Leite e derivados",
		"kcal": 257,
		"protein": 9.6,
		"carbs": 2.4,
		"fat": 23.4,
		"fiber": null,
		"liquid": true,
		"aliases": []
	},
	{
		"id": 480,
		"name": "Refrigerante, tipo cola",
		"category": "Bebidas (alcoólicas e não alcoólicas)",
		"kcal": 34,
		"protein": 0,
		"carbs": 8.7,
		"fat": 0,
		"fiber": null,
		"liquid": true,
		"aliases": []
	},
	{
		"id": 481,
		"name": "Refrigerante, tipo guaraná",
		"category": "Bebidas (alcoólicas e não alcoólicas)",
		"kcal": 39,
		"protein": 0,
		"carbs": 10,
		"fat": 0,
		"fiber": null,
		"liquid": true,
		"aliases": []
	},
	{
		"id": 149,
		"name": "Repolho, branco, cru",
		"category": "Verduras, hortaliças e derivados",
		"kcal": 17,
		"protein": .9,
		"carbs": 3.9,
		"fat": .1,
		"fiber": 1.9,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 318,
		"name": "Sardinha, assada",
		"category": "Pescados e frutos do mar",
		"kcal": 164,
		"protein": 32.2,
		"carbs": 0,
		"fat": 3,
		"fiber": null,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 584,
		"name": "Soja, queijo (tofu)",
		"category": "Leguminosas e derivados",
		"kcal": 64,
		"protein": 6.6,
		"carbs": 2.1,
		"fat": 4,
		"fiber": .8,
		"liquid": false,
		"aliases": ["tofu"]
	},
	{
		"id": 551,
		"name": "Tapioca, com manteiga",
		"category": "Alimentos preparados",
		"kcal": 348,
		"protein": .1,
		"carbs": 63.6,
		"fat": 10.9,
		"fiber": 0,
		"liquid": false,
		"aliases": ["tapioca", "beiju"]
	},
	{
		"id": 157,
		"name": "Tomate, com semente, cru",
		"category": "Verduras, hortaliças e derivados",
		"kcal": 15,
		"protein": 1.1,
		"carbs": 3.1,
		"fat": .2,
		"fiber": 1.2,
		"liquid": false,
		"aliases": []
	},
	{
		"id": 256,
		"name": "Uva, Itália, crua",
		"category": "Frutas e derivados",
		"kcal": 53,
		"protein": .7,
		"carbs": 13.6,
		"fat": .2,
		"fiber": .9,
		"liquid": false,
		"aliases": []
	}
];
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
	const factor = unit === "kg" || unit === "L" ? quantity * 1e3 / 100 : quantity / 100;
	const scale = (value, digits) => {
		if (value == null) return null;
		const next = value * factor;
		return digits === 0 ? Math.round(next) : round1(next);
	};
	return {
		note: food.liquid && (unit === "ml" || unit === "L") ? `Referência ${TACO_SOURCE}, por 100 g. Para líquido, 1 ml foi tratado como 1 g — uma aproximação.` : `Referência ${TACO_SOURCE}, por 100 g. A porção é a que você informou.`,
		draft: makeFood({
			id: crypto.randomUUID(),
			name: food.name,
			quantity,
			unit,
			calories: scale(food.kcal, 0),
			protein: scale(food.protein, 1),
			carbohydrates: scale(food.carbs, 1),
			fat: scale(food.fat, 1),
			fiber: scale(food.fiber, 1),
			source: "taco",
			dataStatus: "reference"
		})
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
										children: [food.dataStatus === "estimate" ? "Estimativa" : food.dataStatus === "reference" ? "Referência" : "Dados não disponíveis", food.confidence != null ? ` · confiança ${Math.round(food.confidence * 100)}%` : ""]
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
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-3 text-sm tabular-nums text-muted",
								children: [
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
						children: [totals.calories, " kcal"]
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
			setFoods([makeFood({
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
				dataStatus: item.calories == null ? "unavailable" : "reference"
			})]);
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
				enqueueMeal(payload);
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
