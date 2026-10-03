import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { deleteMeal, duplicateMeal, getHome, type HomeData, type MealDTO } from "@/lib/calu/api";
import { friendlyError, shiftDay, todayKey } from "@/lib/calu/client";
import { MEAL_TYPES, mealLabel } from "@/lib/calu/domain";
import { Boot, Button, Shell } from "@/components/calu/chrome";

export const Route = createFileRoute("/diario")({ component: DiaryPage });

function DiaryPage() {
  const { user, isPending } = useCurrentUserState();
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => setDay(todayKey()), []);
  if (isPending || !day) return <Boot />;
  if (!user) return <Navigate to="/login" />;
  return <DiaryBody day={day} setDay={setDay} />;
}

function DiaryBody({ day, setDay }: { day: string; setDay: (day: string) => void }) {
  const navigate = useNavigate();
  const [home, setHome] = useState<HomeData | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function load(next = day) {
    const result = await getHome({ data: { day: next } });
    if (result.ok) setHome(result.data);
    else toast.error(result.error);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  if (!home) return <Boot />;
  if (!home.profile) return <Navigate to="/comecar" />;

  const grouped = MEAL_TYPES.map((type) => ({
    ...type,
    meals: home.meals.filter((meal) => meal.mealType === type.id),
  })).filter((group) => group.meals.length > 0);

  function edit(meal: MealDTO) {
    sessionStorage.setItem("calu.edit", JSON.stringify(meal));
    void navigate({ to: "/registrar", search: { modo: "editar", id: meal.id } });
  }

  return (
    <Shell title="Meu dia">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="h-11 px-2 text-sm" onClick={() => setDay(shiftDay(day, -1))}>
          Anterior
        </button>
        <h1 className="text-center font-display text-2xl font-medium capitalize">
          {format(parseISO(day), "d MMM", { locale: ptBR })}
        </h1>
        <button
          type="button"
          className="h-11 px-2 text-sm disabled:opacity-40"
          disabled={day >= todayKey()}
          onClick={() => setDay(shiftDay(day, 1))}
        >
          Próximo
        </button>
      </div>
      {grouped.length === 0 ? (
        <p className="mt-8 text-muted">Nenhuma refeição neste dia.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {grouped.map((group) => (
            <section key={group.id}>
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
                          <span className="tabular-nums text-sm">{Math.round(meal.calories)} kcal</span>
                        </div>
                        <p className="mt-1 text-sm text-muted">
                          {clock} · {Math.round(meal.protein)} g proteína
                        </p>
                        <p className="mt-1 text-sm">{meal.foods.map((food) => food.name).join(" · ")}</p>
                      </button>
                      {expanded ? (
                        <div className="mt-3 space-y-2">
                          <ul className="text-sm text-muted">
                            {meal.foods.map((food) => (
                              <li key={food.id}>
                                {food.name} — {food.quantity} {food.unit}
                                {food.calories == null ? " · Dados não disponíveis" : ` · ${food.calories} kcal`}
                              </li>
                            ))}
                          </ul>
                          {meal.incomplete ? <p className="text-xs text-subtle">Total parcial.</p> : null}
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button variant="secondary" className="h-11" onClick={() => edit(meal)}>
                              Editar
                            </Button>
                            <Button
                              variant="secondary"
                              className="h-11"
                              onClick={() =>
                                void duplicateMeal({ data: { id: meal.id, day: todayKey() } })
                                  .then((res) => {
                                    if (!res.ok) toast.error(res.error);
                                    else {
                                      toast.success("Duplicada em hoje.");
                                      void load();
                                    }
                                  })
                                  .catch((error) => toast.error(friendlyError(error)))
                              }
                            >
                              Duplicar
                            </Button>
                            {confirmId === meal.id ? (
                              <Button
                                variant="danger"
                                className="h-11"
                                onClick={() =>
                                  void deleteMeal({ data: meal.id })
                                    .then(() => {
                                      setConfirmId(null);
                                      void load();
                                    })
                                    .catch((error) => toast.error(friendlyError(error)))
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
