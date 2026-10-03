import { b as parseAnalysis, f as extractJson } from "./middleware-DXgQgsCD.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ai.server-BURMQqul.js
/**
* Camada de IA da Calu. A chave nunca sai do servidor.
*
* Provedor padrão: Grok (xAI), modelo grok-4.5, via XAI_API_KEY injetada.
* Gemini fica pronto: defina GEMINI_API_KEY no ambiente do servidor e
* CALU_AI_PROVIDER=gemini. Não coloque essas variáveis em código cliente
* nem em arquivo .env versionado.
*/
var CALU_SYSTEM = `Você é Calu, uma assistente de acompanhamento alimentar.
Sua função é ajudar o usuário a registrar, compreender e acompanhar seus hábitos alimentares.
Você deve:
- ser acolhedora, objetiva e não julgadora;
- deixar claro quando algo é uma estimativa;
- pedir confirmação quando houver incerteza;
- respeitar preferências e restrições que o próprio usuário informou;
- incentivar hábitos sustentáveis, sem culpa e sem competição;
- não diagnosticar;
- não prescrever medicamentos;
- não prescrever dietas terapêuticas;
- não substituir nutricionista ou médico;
- não sugerir ingestões muito baixas nem restrição extrema;
- não afirmar que um alimento causa doença.
Ao analisar uma imagem, identifique apenas alimentos observáveis com razoável confiança.
Quando não conseguir determinar um alimento ou quantidade, informe a incerteza.
Nunca invente precisão. Use linguagem de estimativa.
Se a pergunta for clínica, diga que ela merece avaliação de um profissional de saúde.
Responda em português do Brasil.`;
var ANALYSIS_SCHEMA = `Responda somente com um objeto JSON válido, sem markdown e sem texto fora do JSON.
Formato:
{
  "mealType": "breakfast" | "lunch" | "snack" | "dinner" | "supper",
  "foods": [
    {
      "name": "nome em português",
      "estimatedQuantity": 150,
      "unit": "g" | "kg" | "ml" | "L" | "unidade" | "fatia" | "colher" | "concha" | "xícara" | "copo" | "porção",
      "confidence": 0.0,
      "calories": 0,
      "protein": 0,
      "carbohydrates": 0,
      "fat": 0,
      "fiber": 0
    }
  ],
  "uncertainties": ["frase curta sobre o que foi estimado"],
  "insight": "uma frase acolhedora, sem julgamento, deixando claro que é estimativa"
}
Regras:
- calories, protein, carbohydrates, fat e fiber são estimativas para a quantidade indicada, não por 100 g.
- Use null em um nutriente quando não houver base razoável. Não invente zero para esconder dúvida.
- confidence entre 0 e 1.
- Prefira alimentos brasileiros quando a imagem for compatível (arroz, feijão, cuscuz, tapioca, farofa, PF, frutas locais).
- Não inclua alimentos que você não consiga ver ou inferir do texto.
- insight não pode culpar, diagnosticar ou prescrever.`;
var AiUnavailable = class extends Error {
	constructor(message) {
		super(message);
		this.name = "AiUnavailable";
	}
};
async function grokComplete(messages, json, maxTokens) {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) throw new AiUnavailable("A análise por IA não está disponível neste ambiente.");
	const send = async (body) => {
		const res = await fetch("https://api.x.ai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify(body)
		});
		return {
			res,
			text: (await res.json().catch(() => null))?.choices?.[0]?.message?.content ?? ""
		};
	};
	const base = {
		model: "grok-4.5",
		messages,
		max_tokens: maxTokens
	};
	const first = await send(json ? {
		...base,
		reasoning_effort: "low",
		response_format: { type: "json_object" }
	} : {
		...base,
		reasoning_effort: "low"
	});
	if (first.res.ok && first.text.trim()) return first.text;
	if (first.res.status !== 400) throw new AiUnavailable("Não consegui falar com a Calu agora. Tente de novo em instantes.");
	const second = await send(base);
	if (!second.res.ok || !second.text.trim()) throw new AiUnavailable("Não consegui falar com a Calu agora. Tente de novo em instantes.");
	return second.text;
}
function analysisFromText(text, hour) {
	const parsed = parseAnalysis(extractJson(text), hour);
	if (!parsed) throw new AiUnavailable("INVALID_JSON");
	return parsed;
}
async function analyzeWithRepair(complete, messages, hour) {
	const first = await complete(messages, true, 900);
	try {
		return analysisFromText(first, hour);
	} catch {
		const second = await complete([
			...messages,
			{
				role: "assistant",
				content: first.slice(0, 4e3)
			},
			{
				role: "user",
				content: "A resposta anterior não era JSON válido. Reenvie somente o objeto JSON no formato pedido, sem markdown. Não invente alimentos que não estavam na resposta."
			}
		], true, 900);
		try {
			return analysisFromText(second, hour);
		} catch {
			throw new AiUnavailable("Não consegui analisar essa refeição com segurança. Tente outra descrição ou uma foto com melhor iluminação.");
		}
	}
}
var GrokProvider = class {
	name = "grok";
	analyzeMealImage(imageBase64, hint, hour) {
		return analyzeWithRepair(grokComplete, [{
			role: "system",
			content: `${CALU_SYSTEM}\n${ANALYSIS_SCHEMA}`
		}, {
			role: "user",
			content: [{
				type: "text",
				text: `Analise a foto da refeição. ${hint}`
			}, {
				type: "image_url",
				image_url: {
					url: `data:image/jpeg;base64,${imageBase64}`,
					detail: "low"
				}
			}]
		}], hour);
	}
	analyzeMealText(text, hint, hour) {
		return analyzeWithRepair(grokComplete, [{
			role: "system",
			content: `${CALU_SYSTEM}\n${ANALYSIS_SCHEMA}`
		}, {
			role: "user",
			content: `Interprete o que a pessoa comeu e estime a nutrição.\n${hint}\nRelato: ${text}`
		}], hour);
	}
	analyzeMealVoice(transcript, hint, hour) {
		return this.analyzeMealText(transcript, `Transcrição de voz. ${hint}`, hour);
	}
	async generateDailyInsight(context) {
		return (await grokComplete([{
			role: "system",
			content: CALU_SYSTEM
		}, {
			role: "user",
			content: `Escreva um único insight curto sobre o dia alimentar abaixo. Sem julgamento, sem diagnóstico, sem nota. Deixe claro que é uma leitura dos registros, não um veredito.\n${context}`
		}], false, 220)).replace(/\s+/g, " ").trim().slice(0, 320);
	}
	async chat(history, context) {
		return (await grokComplete([{
			role: "system",
			content: `${CALU_SYSTEM}\nContexto do usuário, já confirmado no aplicativo:\n${context}`
		}, ...history.slice(-10).map((m) => ({
			role: m.role,
			content: m.content
		}))], false, 500)).trim().slice(0, 2e3);
	}
};
async function geminiComplete(messages, json, maxTokens) {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) throw new AiUnavailable("O Gemini não está configurado. Defina GEMINI_API_KEY no servidor ou use o provedor Grok.");
	const system = messages.find((m) => m.role === "system");
	const contents = messages.filter((m) => m.role !== "system").map((m) => {
		const parts = [];
		if (typeof m.content === "string") parts.push({ text: m.content });
		else for (const part of m.content) if (part.type === "text") parts.push({ text: part.text });
		else {
			const data = part.image_url.url.replace(/^data:image\/jpeg;base64,/, "");
			parts.push({ inline_data: {
				mime_type: "image/jpeg",
				data
			} });
		}
		return {
			role: m.role === "assistant" ? "model" : "user",
			parts
		};
	});
	const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-goog-api-key": apiKey
		},
		body: JSON.stringify({
			systemInstruction: { parts: [{ text: typeof system?.content === "string" ? system.content : CALU_SYSTEM }] },
			contents,
			generationConfig: {
				maxOutputTokens: maxTokens,
				temperature: .2,
				...json ? { responseMimeType: "application/json" } : {}
			}
		})
	});
	if (!res.ok) throw new AiUnavailable("Não consegui falar com a Calu agora. Tente de novo em instantes.");
	const text = (await res.json()).candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
	if (!text.trim()) throw new AiUnavailable("A Calu não retornou uma resposta utilizável.");
	return text;
}
var GeminiProvider = class {
	name = "gemini";
	analyzeMealImage(imageBase64, hint, hour) {
		return analyzeWithRepair(geminiComplete, [{
			role: "system",
			content: `${CALU_SYSTEM}\n${ANALYSIS_SCHEMA}`
		}, {
			role: "user",
			content: [{
				type: "text",
				text: `Analise a foto da refeição. ${hint}`
			}, {
				type: "image_url",
				image_url: {
					url: `data:image/jpeg;base64,${imageBase64}`,
					detail: "low"
				}
			}]
		}], hour);
	}
	analyzeMealText(text, hint, hour) {
		return analyzeWithRepair(geminiComplete, [{
			role: "system",
			content: `${CALU_SYSTEM}\n${ANALYSIS_SCHEMA}`
		}, {
			role: "user",
			content: `Interprete o que a pessoa comeu e estime a nutrição.\n${hint}\nRelato: ${text}`
		}], hour);
	}
	analyzeMealVoice(transcript, hint, hour) {
		return this.analyzeMealText(transcript, `Transcrição de voz. ${hint}`, hour);
	}
	async generateDailyInsight(context) {
		return (await geminiComplete([{
			role: "system",
			content: CALU_SYSTEM
		}, {
			role: "user",
			content: `Um insight curto, sem julgamento.\n${context}`
		}], false, 220)).replace(/\s+/g, " ").trim().slice(0, 320);
	}
	async chat(history, context) {
		return (await geminiComplete([{
			role: "system",
			content: `${CALU_SYSTEM}\nContexto:\n${context}`
		}, ...history.slice(-10)], false, 500)).trim().slice(0, 2e3);
	}
};
function getAIProvider() {
	if ((process.env.CALU_AI_PROVIDER ?? "grok").toLowerCase() === "gemini" && process.env.GEMINI_API_KEY) return new GeminiProvider();
	if (process.env.XAI_API_KEY) return new GrokProvider();
	if (process.env.GEMINI_API_KEY) return new GeminiProvider();
	throw new AiUnavailable("A análise por IA não está disponível neste ambiente.");
}
function aiErrorMessage(error) {
	if (error instanceof AiUnavailable && error.message !== "INVALID_JSON") return error.message;
	return "Não consegui analisar essa refeição com segurança. Você pode tentar de novo ou registrar os alimentos manualmente.";
}
//#endregion
export { aiErrorMessage, getAIProvider };
