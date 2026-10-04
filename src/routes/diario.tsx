import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  addWater,
  askCoach,
  askInsight,
  deleteMeal,
  duplicateMeal,
  getHome,
  repeatFood,
  saveMeal,
  type HomeData,
  type MealDTO,
} from "@/lib/calu/api";
import { foodFromTaco, suggestSubstitutes } from "@/lib/calu/catalog";
import { friendlyError, todayKey } from "@/lib/calu/client";
import { MEAL_TYPES, formatQty, mealLabel, withQuantity, type FoodDraft } from "@/lib/calu/domain";
import { foodRecordState } from "@/lib/calu/daily-board";
import { COACH_UNAVAILABLE, type CoachAnswer } from "@/lib/calu/daily-coach";
import { shiftDayKey } from "@/lib/calu/timezone";
import { Boot, Button, Meter, Shell, controlClass } from "@/components/calu/chrome";
import { CoachCard } from "@/components/calu/coach-card";

export const Route = createFileRoute("/diario")({ component: DiaryPage });

function DiaryPage() {
  const { user, isPending } = useCurrentUserState();
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => setDay(todayKey()), []);
  if (isPending || !day) return <Boot />;
  if (!user) return <Navigate to="/login" />;
  return <DiaryBody day={day} setDay={setDay} />;
}

function progressLabel(consumed: number, target: number | null, unit: string): string {
  const shown = Number.isInteger(consumed) ? String(consumed) : consumed.toFixed(1).replace(".", ",");
  if (target == null) return `${shown} ${unit} · meta não configurada`;
  return `${shown} / ${Math.round(target)} ${unit}`;
}

function DiaryBody({ day, setDay }: { day: string; setDay: (day: string) => void }) {
  const navigate = useNavigate();
  const [home, setHome] = useState<HomeData | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [customWater, setCustomWater] = useState("");
  const [insight, setInsight] = useState("");
  const [insightBusy, setInsightBusy] = useState(false);
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachReply, setCoachReply] = useState<CoachAnswer | null>(null);
  const today = todayKey();
  const futureLocked = day >= today;

  async function load(next = day) {
    const result = await getHome({ data: { day: next } });
    if (result.ok) {
      setHome(result.data);
      if (result.data.cachedInsight) setInsight(result.data.cachedInsight);
      setCoachReply(null);
    } else toast.error(result.error);
  }

  useEffect(() => {
    setInsight("");
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  if (!home) return <Boot />;
  if (!home.profile) return <Navigate to="/comecar" />;

  const board = home.board;
  const minor = (home.profile.age != null && home.profile.age < 18) || Boolean(home.goals?.qualitative);
  const grouped = MEAL_TYPES.map((type) => ({
    ...type,
    meals: home.meals.filter((meal) => meal.mealType === type.id),
  })).filter((group) => group.meals.length > 0);
  const empty = home.meals.length === 0 && home.waterMl === 0;
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  function edit(meal: MealDTO) {
    sessionStorage.setItem("calu.edit", JSON.stringify(meal));
    void navigate({ to: "/registrar", search: { modo: "editar", id: meal.id, manual: false } });
  }

  async function persist(meal: MealDTO, foods: FoodDraft[], message: string) {
    const result = await saveMeal({
      data: {
        id: meal.id,
        day: meal.day,
        mealType: meal.mealType,
        eatenAt: meal.eatenAt,
        source: meal.source,
        note: meal.note,
        uncertainties: meal.uncertainties,
        insight: meal.insight,
        foods,
      },
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(message);
    await load();
  }

  async function drink(amount: number) {
    const result = await addWater({ data: { day, amountMl: amount } });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Água registrada");
      setHome((current) => (current ? { ...current, waterMl: result.data.waterMl } : current));
      await load();
    }
  }

  return (
    <Shell title="Meu dia">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="h-11 px-2 text-sm" aria-label="Dia anterior" onClick={() => setDay(shiftDayKey(day, -1))}>
          Dia anterior
        </button>
        <div className="text-center">
          <p className="text-xs tracking-wide text-muted uppercase">{day === today ? "Hoje" : "Dia"}</p>
          <h1 className="font-display text-2xl font-medium capitalize">{format(parseISO(day), "d MMM", { locale: ptBR })}</h1>
        </div>
        <button
          type="button"
          className="h-11 px-2 text-sm disabled:opacity-40"
          aria-label="Dia seguinte"
          disabled={futureLocked}
          onClick={() => setDay(shiftDayKey(day, 1))}
        >
          Dia seguinte
        </button>
      </div>

      {empty ? (
        <section className="mt-8 rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-3xl font-medium">{hello}</h2>
          <p className="mt-2 text-muted">Vamos começar seu dia? Registre sua primeira refeição e o CALU vai acompanhando sua evolução.</p>
          <div className="mt-4 space-y-2">
            <Button className="w-full" onClick={() => navigate({ to: "/registrar", search: { modo: "busca", id: "", manual: false } })}>
              + Registrar alimento
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => void drink(200)}>
              Registrar água
            </Button>
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-3xl border border-border bg-card p-4" aria-label="Resumo nutricional">
          <h2 className="font-display text-2xl font-medium">Resumo do dia</h2>
          {board ? <p className="mt-1 text-sm text-muted">{board.note}</p> : null}
          <div className="mt-4 space-y-4">
            {minor || !board || board.calories.target == null ? (
              <p className="text-sm">{progressLabel(board?.calories.consumed ?? 0, null, "kcal")}</p>
            ) : (
              <Meter label="Calorias" value={board.calories.consumed} goal={board.calories.target} unit="kcal" />
            )}
            {minor || !board || board.protein.target == null ? (
              <p className="text-sm">{progressLabel(board?.protein.consumed ?? 0, null, "g de proteína")}</p>
            ) : (
              <Meter label="Proteína" value={board.protein.consumed} goal={board.protein.target} unit="g" />
            )}
            <div className="grid grid-cols-3 gap-3 text-sm">
              <Macro label="Carboidratos" line={progressLabel(board?.carbohydrates.consumed ?? 0, board?.carbohydrates.target ?? null, "g")} />
              <Macro label="Gorduras" line={progressLabel(board?.fat.consumed ?? 0, board?.fat.target ?? null, "g")} />
              <Macro label="Fibras" line={progressLabel(board?.fiber.consumed ?? 0, board?.fiber.target ?? null, "g")} />
            </div>
            {board?.water.target != null ? (
              <Meter label="Água" value={board.water.consumed} goal={board.water.target} unit="ml" tone="water" />
            ) : (
              <p className="text-sm">{progressLabel(home.waterMl, null, "ml de água")}</p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[200, 300, 500].map((amount) => (
              <Button key={amount} variant="secondary" className="h-11" onClick={() => void drink(amount)}>
                +{amount} ml
              </Button>
            ))}
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const amount = Number(customWater);
              if (!Number.isInteger(amount)) {
                toast.error("Informe a água em mililitros.");
                return;
              }
              setCustomWater("");
              void drink(amount);
            }}
          >
            <label className="min-w-0 flex-1">
              <span className="sr-only">Outra quantidade de água em ml</span>
              <input
                className={controlClass}
                inputMode="numeric"
                placeholder="Outra quantidade (ml)"
                value={customWater}
                onChange={(event) => setCustomWater(event.target.value)}
              />
            </label>
            <Button type="submit" className="shrink-0">
              Registrar outra quantidade
            </Button>
          </form>
        </section>
      )}

      <div className="mt-4">
        <Button className="w-full" onClick={() => navigate({ to: "/registrar", search: { modo: "busca", id: "", manual: false } })}>
          + Adicionar alimento
        </Button>
      </div>

      {home.coach ? (
        <CoachCard
          card={home.coach}
          busy={coachBusy}
          reply={coachReply}
          onAction={(card) => {
            if (card.action === "water") void drink(200);
            else if (card.action === "meal") void navigate({ to: "/registrar", search: { modo: "busca", id: "", manual: false } });
            else if (card.action === "weight") void navigate({ to: "/progresso" });
            else if (card.action === "goals") void navigate({ to: "/" });
            else document.getElementById("refeicoes")?.scrollIntoView({ block: "start" });
          }}
          onAsk={(question) => {
            setCoachBusy(true);
            void askCoach({ data: { day, question } })
              .then((result) => {
                if (!result.ok) {
                  setCoachReply({
                    state: home.coach?.state ?? "ON_TRACK",
                    title: home.coach?.title ?? "CALU Coach",
                    message: result.error.includes("pergunta") ? result.error : COACH_UNAVAILABLE,
                    support: home.coach?.message ?? "",
                    reason: home.coach?.reason ?? "",
                    action: home.coach?.action ?? "diary",
                    actionLabel: home.coach?.actionLabel ?? "Ver diário",
                    source: "fallback",
                  });
                  return;
                }
                setCoachReply(result.data);
              })
              .catch(() => {
                setCoachReply({
                  state: home.coach?.state ?? "ON_TRACK",
                  title: home.coach?.title ?? "CALU Coach",
                  message: COACH_UNAVAILABLE,
                  support: home.coach?.message ?? "",
                  reason: home.coach?.reason ?? "",
                  action: home.coach?.action ?? "diary",
                  actionLabel: home.coach?.actionLabel ?? "Ver diário",
                  source: "fallback",
                });
              })
              .finally(() => setCoachBusy(false));
          }}
        />
      ) : null}

      <section className="mt-6 rounded-3xl bg-card px-4 py-4">
        <h2 className="font-display text-xl font-medium">CALU percebeu</h2>
        <p className="mt-2 text-sm leading-6">{insight || board?.note || "O diário continua disponível mesmo sem a Calu."}</p>
        <Button
          variant="secondary"
          className="mt-3"
          disabled={insightBusy}
          onClick={() => {
            setInsightBusy(true);
            void askInsight({ data: { day } })
              .then((result) => {
                if (!result.ok) toast.error(result.error);
                else setInsight(result.data.insight);
              })
              .catch((error) => toast.error(friendlyError(error)))
              .finally(() => setInsightBusy(false));
          }}
        >
          {insightBusy ? "Olhando o dia" : "Pedir um olhar da Calu"}
        </Button>
      </section>

      {grouped.length === 0 ? (
        <p className="mt-8 text-muted">Nenhuma refeição neste dia.</p>
      ) : (
        <div id="refeicoes" className="mt-6 space-y-4">
          {grouped.map((group) => (
            <section key={group.id} aria-label={group.label}>
              <h2 className="text-sm tracking-wide text-muted uppercase">{group.label}</h2>
              <ul className="mt-2 space-y-2">
                {group.meals.map((meal) => {
                  const expanded = open === meal.id;
                  const time = new Date(meal.eatenAt);
                  const clock = Number.isNaN(time.getTime())
                    ? ""
                    : time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <li key={meal.id} className="rounded-3xl border border-border bg-card p-4">
                      <button type="button" className="w-full text-left" onClick={() => setOpen(expanded ? null : meal.id)}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-medium">{mealLabel(meal.mealType)}</span>
                          <span className="tabular-nums text-sm">~{Math.round(meal.calories)} kcal</span>
                        </div>
                        <p className="mt-1 text-sm text-muted">{clock}</p>
                      </button>
                      <ul className="mt-2 space-y-1 text-sm">
                        {meal.foods.map((food) => (
                          <li key={food.id}>
                            {food.name} — {formatQty(food.quantity, food.unit)}
                            {food.calories == null ? " · Dados não disponíveis" : ` · ${food.calories} kcal`}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-sm font-medium">Total: {Math.round(meal.calories)} kcal</p>
                      {expanded ? (
                        <div className="mt-3 space-y-3">
                          {meal.foods.map((food) => {
                            const state = foodRecordState(food);
                            const swaps = suggestSubstitutes(food.name);
                            return (
                              <div key={food.id} className="rounded-2xl border border-border p-3">
                                {state !== "CONFIRMED" ? (
                                  <p className="text-sm">
                                    {food.nutritionSource === "OPEN_FOOD_FACTS"
                                      ? "Algumas informações nutricionais não estão disponíveis."
                                      : "Atenção: este registro precisa ser confirmado."}
                                  </p>
                                ) : null}
                                <form
                                  className="mt-2 flex gap-2"
                                  onSubmit={(event) => {
                                    event.preventDefault();
                                    const form = new FormData(event.currentTarget);
                                    const quantity = Number(String(form.get("quantity") ?? "").replace(",", "."));
                                    const next = meal.foods.map((item) => (item.id === food.id ? withQuantity(item, quantity) : item));
                                    void persist(meal, next, "Alimento atualizado");
                                  }}
                                >
                                  <label className="min-w-0 flex-1">
                                    <span className="sr-only">Quantidade de {food.name}</span>
                                    <input name="quantity" className={controlClass} defaultValue={String(food.quantity)} inputMode="decimal" />
                                  </label>
                                  <Button type="submit" variant="secondary" className="shrink-0">
                                    Atualizar
                                  </Button>
                                </form>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Button
                                    variant="secondary"
                                    className="h-11"
                                    onClick={() =>
                                      void repeatFood({
                                        data: {
                                          foodId: food.id,
                                          day,
                                          quantity: food.quantity,
                                          unit: food.unit,
                                          mealType: meal.mealType,
                                        },
                                      }).then((result) => {
                                        if (!result.ok) toast.error(result.error);
                                        else {
                                          toast.success("Alimento repetido");
                                          void load();
                                        }
                                      })
                                    }
                                  >
                                    Repetir
                                  </Button>
                                  {food.calories != null && (state === "PARTIAL" || state === "NEEDS_CONFIRMATION") ? (
                                    <Button
                                      variant="secondary"
                                      className="h-11"
                                      onClick={() =>
                                        void persist(
                                          meal,
                                          meal.foods.map((item) =>
                                            item.id === food.id
                                              ? { ...item, source: "user", nutritionSource: "USER_CONFIRMED", dataStatus: "reference", review: "high" }
                                              : item,
                                          ),
                                          "Registro confirmado",
                                        )
                                      }
                                    >
                                      Confirmar
                                    </Button>
                                  ) : null}
                                  <Button variant="ghost" className="h-11" onClick={() => edit(meal)}>
                                    Corrigir
                                  </Button>
                                </div>
                                {swaps.length > 0 ? (
                                  <div className="mt-2">
                                    <p className="text-xs text-muted">Substituir por um alimento do catálogo</p>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                      {swaps.map((swap) => (
                                        <button
                                          key={swap.id}
                                          type="button"
                                          className="h-10 rounded-full border border-border px-3 text-sm"
                                          onClick={() => {
                                            const built = foodFromTaco(swap, food.unit === "g" || food.unit === "kg" ? food.quantity : 100, food.unit === "kg" ? "kg" : "g");
                                            const next = meal.foods.map((item) => (item.id === food.id ? { ...built.draft, id: food.id } : item));
                                            void persist(meal, next, "Alimento atualizado");
                                          }}
                                        >
                                          {swap.name}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                          <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" className="h-11" onClick={() => edit(meal)}>
                              Editar
                            </Button>
                            <Button
                              variant="secondary"
                              className="h-11"
                              onClick={() =>
                                void duplicateMeal({ data: { id: meal.id, day } }).then((result) => {
                                  if (!result.ok) toast.error(result.error);
                                  else {
                                    toast.success("Refeição repetida");
                                    void load();
                                  }
                                })
                              }
                            >
                              Repetir refeição
                            </Button>
                            {confirmId === meal.id ? (
                              <Button
                                variant="danger"
                                className="h-11"
                                onClick={() =>
                                  void deleteMeal({ data: meal.id }).then((result) => {
                                    if (!result.ok) toast.error(result.error);
                                    else {
                                      setConfirmId(null);
                                      toast.success("Refeição removida");
                                      void load();
                                    }
                                  })
                                }
                              >
                                Excluir agora
                              </Button>
                            ) : (
                              <Button variant="ghost" className="h-11" onClick={() => setConfirmId(meal.id)}>
                                Excluir
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Shell>
  );
}

function Macro({ label, line }: { label: string; line: string }) {
  return (
    <div>
      <p className="text-muted">{label}</p>
      <p className="mt-1 tabular-nums">{line}</p>
    </div>
  );
}
