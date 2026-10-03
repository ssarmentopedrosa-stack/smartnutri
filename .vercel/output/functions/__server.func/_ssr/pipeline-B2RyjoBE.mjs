import { A as routeConfidence, P as withQuantity, h as fold, k as round1, y as makeFood } from "./validation-D7j3wXdT.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/pipeline-B2RyjoBE.js
function calculateNutrition(per100, grams) {
	if (!Number.isFinite(grams) || grams <= 0 || grams > 2e4) throw new Error("Quantidade em gramas inválida para o cálculo nutricional.");
	const factor = grams / 100;
	const scale = (value, digits) => {
		if (value == null || !Number.isFinite(value)) return null;
		const next = value * factor;
		return digits === 0 ? Math.round(next) : round1(next);
	};
	return {
		calories: scale(per100.calories, 0),
		protein: scale(per100.protein, 1),
		carbohydrates: scale(per100.carbohydrates, 1),
		fat: scale(per100.fat, 1),
		fiber: scale(per100.fiber, 1)
	};
}
var PIECES = [
	{
		match: /ovo/,
		grams: 50
	},
	{
		match: /banana/,
		grams: 70
	},
	{
		match: /pao, trigo, frances|pao frances/,
		grams: 50
	},
	{
		match: /pao, trigo, forma|pao de forma/,
		grams: 25
	},
	{
		match: /maca|maçã/,
		grams: 130
	},
	{
		match: /laranja/,
		grams: 150
	}
];
var SPOONS = [
	{
		match: /arroz/,
		grams: 25
	},
	{
		match: /feijao|feijão/,
		grams: 20
	},
	{
		match: /acucar|açúcar/,
		grams: 12
	},
	{
		match: /azeite/,
		grams: 8
	},
	{
		match: /aveia/,
		grams: 10
	}
];
var CUPS = [
	{
		match: /arroz/,
		grams: 160
	},
	{
		match: /feijao|feijão/,
		grams: 140
	},
	{
		match: /leite/,
		grams: 200
	},
	{
		match: /aveia/,
		grams: 30
	}
];
function known(table, name) {
	const hit = table.find((item) => item.match.test(name));
	return hit ? hit.grams : null;
}
/**
* Converte quantidade + unidade para gramas quando existe base conhecida.
* Retorna null se a conversão seria um chute.
*/
function toGrams(name, quantity, unit, liquid = false) {
	if (!Number.isFinite(quantity) || quantity <= 0) return null;
	const folded = name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
	if (unit === "g") return quantity;
	if (unit === "kg") return quantity * 1e3;
	if (unit === "ml" && liquid) return quantity;
	if (unit === "L" && liquid) return quantity * 1e3;
	if (unit === "unidade" || unit === "fatia") {
		const grams = known(PIECES, folded);
		return grams == null ? null : grams * quantity;
	}
	if (unit === "colher") {
		const grams = known(SPOONS, folded);
		return grams == null ? null : grams * quantity;
	}
	if (unit === "xícara" || unit === "xicara") {
		const grams = known(CUPS, folded);
		return grams == null ? null : grams * quantity;
	}
	if (unit === "copo" && liquid) return 200 * quantity;
	if (unit === "concha" && /feijao/.test(folded)) return 80 * quantity;
	return null;
}
function applyPortionPreset(food, preset) {
	const factor = preset === "pequena" ? .65 : preset === "grande" ? 1.45 : 1;
	const base = food.baseQuantity > 0 ? food.baseQuantity : food.quantity;
	return withQuantity(food, Math.round(base * factor * 10) / 10);
}
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
var ALIASES = {
	arroz: "Arroz, tipo 1, cozido",
	"arroz branco": "Arroz, tipo 1, cozido",
	"arroz cozido": "Arroz, tipo 1, cozido",
	"arroz branco cozido": "Arroz, tipo 1, cozido",
	"arroz integral": "Arroz, integral, cozido",
	"arroz integral cozido": "Arroz, integral, cozido",
	feijao: "Feijão, carioca, cozido",
	"feijao carioca": "Feijão, carioca, cozido",
	"feijao preto": "Feijão, preto, cozido",
	frango: "Frango, peito, sem pele, grelhado",
	"peito de frango": "Frango, peito, sem pele, grelhado",
	"frango grelhado": "Frango, peito, sem pele, grelhado",
	ovo: "Ovo, de galinha, inteiro, cozido/10minutos",
	ovos: "Ovo, de galinha, inteiro, cozido/10minutos",
	"ovo cozido": "Ovo, de galinha, inteiro, cozido/10minutos",
	banana: "Banana, prata, crua",
	"pao frances": "Pão, trigo, francês",
	"pao de forma": "Pão, trigo, forma, integral",
	"batata cozida": "Batata, inglesa, cozida",
	"batata frita": "Batata, inglesa, frita",
	cuscuz: "Cuscuz, de milho, cozido com sal",
	tapioca: "Tapioca, com manteiga",
	farofa: "Mandioca, farofa, temperada",
	cafe: "Café, infusão 10%",
	"leite integral": "Leite, de vaca, integral",
	iogurte: "Iogurte, natural",
	queijo: "Queijo, minas, frescal",
	"queijo minas": "Queijo, minas, frescal",
	mussarela: "Queijo, mozarela",
	muçarela: "Queijo, mozarela",
	tofu: "Soja, queijo (tofu)",
	lentilha: "Lentilha, cozida",
	macarrao: "Macarrão, molho bolognesa",
	"carne grelhada": "Carne, bovina, patinho, sem gordura, grelhado",
	patinho: "Carne, bovina, patinho, sem gordura, grelhado",
	acai: "Açaí, polpa, congelada",
	azeite: "Azeite, de oliva, extra virgem"
};
function per100Of(food) {
	return {
		calories: food.kcal,
		protein: food.protein,
		carbohydrates: food.carbs,
		fat: food.fat,
		fiber: food.fiber
	};
}
function tokens(value) {
	return fold(value).split(/[^a-z0-9]+/).filter((part) => part.length > 2 && ![
		"com",
		"sem",
		"tipo",
		"cru",
		"crua"
	].includes(part));
}
function resolveFoodName(rawName) {
	const name = rawName.trim().slice(0, 80);
	const key = fold(name);
	const alias = ALIASES[key];
	if (alias) {
		const food = TACO_FOODS.find((item) => item.name === alias);
		if (food) return {
			name: food.name,
			taco: food,
			source: "TACO",
			matchConfidence: .96,
			per100: per100Of(food),
			liquid: food.liquid
		};
	}
	const exact = TACO_FOODS.find((item) => fold(item.name) === key || item.aliases.some((alias) => fold(alias) === key));
	if (exact) return {
		name: exact.name,
		taco: exact,
		source: "TACO",
		matchConfidence: .93,
		per100: per100Of(exact),
		liquid: exact.liquid
	};
	const queryTokens = tokens(name);
	let best = null;
	for (const food of TACO_FOODS) {
		const hay = tokens(`${food.name} ${food.aliases.join(" ")}`);
		if (queryTokens.length === 0 || hay.length === 0) continue;
		const score = queryTokens.filter((token) => hay.includes(token)).length / queryTokens.length;
		if (!best || score > best.score) best = {
			food,
			score
		};
	}
	if (best && best.score >= .8) return {
		name: best.food.name,
		taco: best.food,
		source: "TACO",
		matchConfidence: Math.min(.9, .7 + best.score * .2),
		per100: per100Of(best.food),
		liquid: best.food.liquid
	};
	return {
		name,
		taco: null,
		source: "AI_ESTIMATE",
		matchConfidence: 0,
		per100: null,
		liquid: false
	};
}
function clamp01(value) {
	if (value == null || !Number.isFinite(value)) return null;
	return Math.max(0, Math.min(1, value));
}
function enrichAnalysis(analysis) {
	const uncertainties = [...analysis.uncertainties];
	const foods = analysis.foods.map((food) => {
		const resolved = resolveFoodName(food.name);
		const identification = clamp01(food.identificationConfidence ?? food.confidence);
		let portion = clamp01(food.portionConfidence ?? food.confidence);
		const grams = toGrams(resolved.taco?.name ?? food.name, food.quantity, food.unit, resolved.liquid);
		let draft = food;
		let nutritionSource = "AI_ESTIMATE";
		let nutritionConfidence = .35;
		if (resolved.per100 && resolved.matchConfidence >= .8 && grams != null && resolved.per100.calories != null) {
			const nutrients = calculateNutrition(resolved.per100, grams);
			nutritionSource = "TACO";
			nutritionConfidence = resolved.matchConfidence;
			draft = makeFood({
				id: food.id,
				name: resolved.name,
				quantity: food.quantity,
				unit: food.unit,
				calories: nutrients.calories,
				protein: nutrients.protein,
				carbohydrates: nutrients.carbohydrates,
				fat: nutrients.fat,
				fiber: nutrients.fiber,
				confidence: identification,
				source: "taco",
				dataStatus: "reference"
			});
		} else if (grams == null && food.unit !== "g" && food.unit !== "kg") {
			portion = Math.min(portion ?? .4, .42);
			if (!uncertainties.some((item) => item.includes(food.name))) uncertainties.push(`Sem conversão confiável para ${food.name}. Confirme a quantidade.`);
		}
		const review = routeConfidence(identification, portion);
		return {
			...draft,
			identificationConfidence: identification,
			portionConfidence: portion,
			nutritionConfidence,
			nutritionSource,
			review
		};
	});
	return {
		...analysis,
		foods,
		uncertainties: uncertainties.slice(0, 6)
	};
}
function nutritionSourceLabel(source, dataStatus) {
	if (source === "TACO") return "Fonte: TACO";
	if (source === "OPEN_FOOD_FACTS") return "Fonte: Open Food Facts";
	if (source === "USER_CONFIRMED") return "Confirmado por você";
	if (dataStatus === "unavailable") return "Dados não disponíveis";
	return "Estimativa";
}
//#endregion
export { enrichAnalysis as a, calculateNutrition as i, TACO_SOURCE as n, nutritionSourceLabel as o, applyPortionPreset as r, TACO_FOODS as t };
