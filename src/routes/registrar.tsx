import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { analyzePhoto, analyzeText, lookupBarcode, saveMeal } from "@/lib/calu/api";
import { foodFromTaco } from "@/lib/calu/catalog";
import { searchFoods } from "@/lib/calu/search";
import { compressImage, enqueueMeal, friendlyError, isOfflineError, todayKey, type MealPayload } from "@/lib/calu/client";
import {
  makeFood,
  type Analysis,
  type FoodDraft,
  type MealType,
} from "@/lib/calu/domain";
import { AddFoodRow, MealEditor } from "@/components/calu/editor";
import { Button, Screen, controlClass } from "@/components/calu/chrome";

export const Route = createFileRoute("/registrar")({
  validateSearch: (search: Record<string, unknown>) => ({
    modo: typeof search.modo === "string" ? search.modo : "foto",
    id: typeof search.id === "string" ? search.id : "",
  }),
  component: RegisterPage,
});

type Phase = "capture" | "analyzing" | "review" | "saved";

function RegisterPage() {
  const { modo, id } = Route.useSearch();
  const { user } = useCurrentUserState();
  const navigate = useNavigate();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("capture");
  const [preview, setPreview] = useState<string>("");
  const [image, setImage] = useState<string>("");
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [query, setQuery] = useState("");
  const [code, setCode] = useState("");
  const [foods, setFoods] = useState<FoodDraft[]>([]);
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [uncertainties, setUncertainties] = useState<string[]>([]);
  const [insight, setInsight] = useState("");
  const [source, setSource] = useState(modo === "voz" ? "voice" : modo === "texto" ? "text" : modo === "busca" ? "search" : modo === "codigo" ? "barcode" : "photo");
  const [offlineNote, setOfflineNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (modo !== "editar" || !id) return;
    const raw = sessionStorage.getItem("calu.edit");
    if (!raw) return;
    const meal = JSON.parse(raw) as MealPayload & { foods: FoodDraft[]; mealType: MealType; uncertainties?: string[]; insight?: string };
    if (meal.id !== id) return;
    setFoods(meal.foods);
    setMealType(meal.mealType);
    setUncertainties(meal.uncertainties ?? []);
    setInsight(meal.insight ?? "");
    setSource(meal.source);
    setPhase("review");
  }, [modo, id]);

  function applyAnalysis(analysis: Analysis, nextSource: string) {
    setFoods(analysis.foods);
    setMealType(analysis.mealType);
    setUncertainties(analysis.uncertainties);
    setInsight(analysis.insight);
    setSource(nextSource);
    setPhase(analysis.foods.length ? "review" : "capture");
    if (!analysis.foods.length) {
      toast.error("Não identifiquei alimentos com segurança. Descreva a refeição ou adicione manualmente.");
    }
  }

  async function onFile(file: File | undefined) {
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
      const hour = new Date().getHours();
      const result = await analyzePhoto({
        data: { imageBase64: image, hour, day: todayKey(), hint: `Horário local aproximado: ${hour}h.` },
      });
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

  async function runText(kind: "text" | "voice") {
    if (text.trim().length < 2) return;
    if (!navigator.onLine) {
      toast.error("A interpretação por IA precisa de conexão. Você ainda pode buscar um alimento da referência.");
      return;
    }
    setPhase("analyzing");
    setBusy(true);
    try {
      const hour = new Date().getHours();
      const result = await analyzeText({
        data: { text, source: kind, hour, day: todayKey(), hint: `Horário local aproximado: ${hour}h.` },
      });
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
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
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

  async function scanCode(value: string) {
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
          dataStatus: item.completeness === "unavailable" ? "unavailable" : "reference",
        });
      draft.nutritionSource = item.nutritionSource;
      draft.nutritionConfidence = item.completeness === "complete" ? 0.9 : item.completeness === "partial" ? 0.55 : 0;
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
    const payload: MealPayload = {
      id: id || crypto.randomUUID(),
      day: todayKey(),
      mealType,
      eatenAt: new Date().toISOString(),
      source,
      note: "",
      uncertainties,
      insight,
      foods,
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

  const hits = searchFoods(query);
  const ask = query.trim().length >= 2 && hits.length > 0 && hits[0]?.confidence !== "high";
  const title =
    phase === "analyzing"
      ? "Analisando"
      : phase === "review"
        ? "Confira sua refeição"
        : phase === "saved"
          ? "Registrado"
          : modo === "voz"
            ? "Falar refeição"
            : modo === "texto"
              ? "O que você comeu?"
              : modo === "busca"
                ? "Buscar alimento"
                : modo === "codigo"
                  ? "Código de barras"
                  : "Fotografar refeição";

  return (
    <Screen>
      <button type="button" className="text-sm text-muted" onClick={() => navigate({ to: "/" })}>
        Voltar
      </button>
      <h1 className="mt-4 font-display text-3xl font-medium tracking-tight">{title}</h1>

      {phase === "analyzing" ? (
        <div className="mt-16">
          <div className="h-1 overflow-hidden rounded-full bg-border">
            <div className="pulse-line h-full origin-left bg-primary" />
          </div>
          <p className="mt-4 text-lg">Analisando sua refeição...</p>
          <p className="mt-2 text-sm text-muted">Isso é uma estimativa, não uma pesagem.</p>
        </div>
      ) : null}

      {phase === "capture" && (modo === "foto" || modo === "photo") ? (
        <div className="mt-6 space-y-3">
          <p className="text-muted">A foto não fica armazenada. Ela segue só para a estimativa e depois é descartada.</p>
          {preview ? <img src={preview} alt="Prévia da refeição" className="w-full rounded-3xl object-cover" /> : null}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
          <Button className="w-full" onClick={() => cameraRef.current?.click()}>
            Tirar foto
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => galleryRef.current?.click()}>
            Escolher da galeria
          </Button>
          {preview ? (
            <Button className="w-full" disabled={busy} onClick={() => void runPhoto()}>
              Analisar com IA
            </Button>
          ) : null}
        </div>
      ) : null}

      {phase === "capture" && modo === "texto" ? (
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void runText("text");
          }}
        >
          <textarea
            className={controlClass + " h-36 py-3"}
            placeholder="Comi 2 ovos, duas fatias de pão e uma banana."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button type="submit" className="w-full" disabled={busy}>
            Interpretar
          </Button>
        </form>
      ) : null}

      {phase === "capture" && modo === "voz" ? (
        <div className="mt-6 space-y-3">
          <Button className="w-full" onClick={speak}>
            {listening ? "Ouvindo..." : "Falar refeição"}
          </Button>
          <textarea className={controlClass + " h-32 py-3"} value={text} onChange={(e) => setText(e.target.value)} placeholder="A transcrição aparece aqui. Você pode editar." />
          <Button className="w-full" disabled={busy || text.trim().length < 2} onClick={() => void runText("voice")}>
            Interpretar
          </Button>
        </div>
      ) : null}

      {phase === "capture" && modo === "busca" ? (
        <div className="mt-6">
          <input className={controlClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Arroz, feijão, tapioca..." />
          {ask ? (
            <p className="mt-3 text-sm">Você quis dizer — confirme o alimento. Nada é registrado sem a sua escolha.</p>
          ) : null}
          <ul className="mt-3 space-y-2">
            {hits.map((hit) => (
              <li key={hit.food.id}>
                <button
                  type="button"
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left"
                  onClick={() => {
                    const built = foodFromTaco(hit.food, 100, "g");
                    built.draft.review = hit.confidence === "low" ? "low" : "high";
                    setFoods([built.draft]);
                    setUncertainties(built.note ? [built.note] : []);
                    setSource("search");
                    setMealType(guessMeal());
                    setPhase("review");
                  }}
                >
                  <span className="font-medium">{hit.food.name}</span>
                  <span className="mt-1 block text-sm text-muted">
                    {hit.food.kcal == null ? "Dados não disponíveis" : `${hit.food.kcal} kcal / 100 g · TACO`}
                    {hit.confidence === "high" ? " · alta confiança" : hit.confidence === "medium" ? " · confirme" : " · baixa confiança"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {query.trim().length >= 2 && hits.length === 0 ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted">Não está na referência TACO deste app. Posso estimar pelo texto, se você confirmar depois.</p>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setText(query);
                  void runText("text");
                }}
              >
                Estimar com a Calu
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {phase === "capture" && modo === "codigo" ? (
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void scanCode(code);
          }}
        >
          <p className="text-muted">Aponte a câmera se o navegador permitir, ou digite o código. Se não acharmos o produto, você cadastra na hora.</p>
          <input className={controlClass} inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="789..." />
          <Button type="submit" className="w-full" disabled={busy}>
            Buscar produto
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setFoods([
                makeFood({
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
                  dataStatus: "unavailable",
                }),
              ]);
              setUncertainties(["Cadastro manual. Dados não disponíveis até você completar."]);
              setSource("manual");
              setPhase("review");
            }}
          >
            Cadastrar manualmente
          </Button>
        </form>
      ) : null}

      {phase === "review" ? (
        <div className="mt-6 space-y-4">
          <p className="text-muted">{source === "photo" || source === "text" || source === "voice" ? "Encontrei aproximadamente..." : "Ajuste antes de salvar."}</p>
          <MealEditor foods={foods} mealType={mealType} onFoods={setFoods} onMealType={setMealType} uncertainties={uncertainties} />
          <AddFoodRow onAdd={(food) => setFoods([...foods, food])} />
          <Button className="w-full" disabled={busy} onClick={() => void confirm()}>
            {busy ? "Salvando" : "Confirmar refeição"}
          </Button>
        </div>
      ) : null}

      {phase === "saved" ? (
        <div className="rise mt-8">
          <p className="text-lg">{offlineNote || "A refeição entrou no seu dia."}</p>
          {insight ? <p className="mt-4 rounded-3xl bg-card p-4 text-sm leading-6">{insight}</p> : null}
          <p className="mt-3 text-sm text-muted">Estimativa confirmada por você. O total do dia já considera este registro quando houver conexão.</p>
          <Button className="mt-6 w-full" onClick={() => navigate({ to: "/" })}>
            Ver o dia
          </Button>
          <Button variant="secondary" className="mt-3 w-full" onClick={() => navigate({ to: "/diario" })}>
            Abrir diário
          </Button>
        </div>
      ) : null}
    </Screen>
  );
}

function guessMeal(): MealType {
  const hour = new Date().getHours();
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 18) return "snack";
  if (hour < 22) return "dinner";
  return "supper";
}

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
};
