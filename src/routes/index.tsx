import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { Camera, Mic, PenLine, ScanBarcode, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { addWater, getHome, saveMeal, track, type HomeData } from "@/lib/calu/api";
import { cacheHome, dropQueued, friendlyError, isOfflineError, readCachedHome, readQueue, rememberTimeZone, todayKey } from "@/lib/calu/client";
import { localInsight, recommend, round1, sumFoods, mealLabel, type GoalTargets } from "@/lib/calu/domain";
import { Boot, Button, Meter, Shell } from "@/components/calu/chrome";

export const Route = createFileRoute("/")({ component: HomePage });

const FALLBACK_GOALS: GoalTargets = {
  calories: 2000,
  protein: 100,
  carbohydrates: 220,
  fat: 65,
  fiber: 25,
  waterMl: 2500,
};

function HomePage() {
  const { user, isPending } = useCurrentUserState();
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => setDay(todayKey()), []);
  if (isPending || !day) return <Boot />;
  if (!user) return <Navigate to="/login" />;
  return <HomeBody day={day} userId={user.id} onDay={setDay} />;
}

function HomeBody({ day, userId, onDay }: { day: string; userId: string; onDay: (day: string) => void }) {
  const navigate = useNavigate();
  const [home, setHome] = useState<HomeData | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const queue = readQueue(userId);
      for (const meal of queue) {
        try {
          const saved = await saveMeal({ data: meal });
          if (saved.ok) dropQueued(userId, meal.id);
        } catch (err) {
          if (isOfflineError(err)) break;
        }
      }
      const result = await getHome({ data: { day } });
      if (!result.ok) {
        setError(result.error);
        const cached = readCachedHome<HomeData>(userId, day);
        if (cached) {
          setHome(cached);
          setOffline(true);
        }
        return;
      }
      setHome(result.data);
      cacheHome(userId, day, result.data);
      setOffline(false);
      setError("");
    } catch (err) {
      const cached = readCachedHome<HomeData>(userId, day);
      if (cached) {
        setHome(cached);
        setOffline(true);
      } else setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    if (!sessionStorage.getItem("calu.open")) {
      sessionStorage.setItem("calu.open", "1");
      void track({ data: "app_open" }).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, userId]);

  useEffect(() => {
    const zone = home?.profile?.timezone;
    if (!zone) return;
    rememberTimeZone(zone);
    const zoned = todayKey(new Date(), zone);
    if (zoned !== day) onDay(zoned);
  }, [home?.profile?.timezone, day, onDay]);

  if (loading) return <Boot />;
  if (!home?.profile) return <Navigate to="/comecar" />;

  const goals = home.goals ?? { ...FALLBACK_GOALS, isEstimate: true, qualitative: false, source: "AI_ESTIMATE" };
  const minor = (home.profile.age != null && home.profile.age < 18) || Boolean(home.goals?.qualitative);
  const foods = home.meals.flatMap((meal) => meal.foods);
  const totals = foods.length
    ? sumFoods(foods)
    : {
        calories: home.meals.reduce((s, m) => s + m.calories, 0),
        protein: home.meals.reduce((s, m) => s + m.protein, 0),
        carbohydrates: home.meals.reduce((s, m) => s + m.carbohydrates, 0),
        fat: home.meals.reduce((s, m) => s + m.fat, 0),
        fiber: home.meals.reduce((s, m) => s + m.fiber, 0),
        incomplete: home.meals.some((m) => m.incomplete),
      };
  const hour = new Date().getHours();
  const insight = localInsight({
    totals,
    goals,
    waterMl: home.waterMl,
    mealCount: home.meals.length,
    hour,
  });
  const idea = recommend({
    diet: home.profile.diet,
    totals,
    goals,
    mealTypes: home.meals.map((m) => m.mealType),
    memory: home.memory.map((m) => m.fact),
  });
  const dateLabel = format(parseISO(day), "EEEE, d 'de' MMMM", { locale: ptBR });

  async function drink(amount: number) {
    const result = await addWater({ data: { day, amountMl: amount } });
    if (result.ok) setHome((current) => (current ? { ...current, waterMl: result.data.waterMl } : current));
  }

  return (
    <Shell title={dateLabel}>
      <div className="rise">
        <h1 className="font-display text-4xl leading-none font-medium tracking-tight">Olá, {home.profile.name}</h1>
        <p className="mt-2 text-muted">Como está sua alimentação hoje?</p>
        {offline ? (
          <p className="mt-3 text-sm text-muted">Sem conexão. Mostrando o que estava salvo neste aparelho. A análise por IA precisa de internet.</p>
        ) : null}
        {error && !offline ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

        <section className="mt-6 rounded-3xl border border-border bg-card p-4">
          {minor ? (
            <div>
              <p className="text-sm text-muted">Acompanhamento qualitativo</p>
              <p className="mt-2 text-sm leading-6">
                Sem meta calórica automática. Hoje há {home.meals.length} refeição(ões) registrada(s)
                {home.meals.length ? ` · ~${Math.round(totals.calories)} kcal anotadas` : ""}. Água: {home.waterMl} ml.
              </p>
            </div>
          ) : (
            <>
          <Meter label="Calorias" value={totals.calories} goal={goals.calories} unit="kcal" />
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
            <Meter label="Proteína" value={totals.protein} goal={goals.protein} unit="g" />
            <Meter label="Carboidratos" value={totals.carbohydrates} goal={goals.carbohydrates} unit="g" />
            <Meter label="Gorduras" value={totals.fat} goal={goals.fat} unit="g" />
            <Meter label="Fibras" value={totals.fiber} goal={goals.fiber} unit="g" />
          </div>
            </>
          )}
          <div className="mt-4">
            <Meter
              label="Água"
              value={round1(home.waterMl / 1000)}
              goal={round1(goals.waterMl / 1000)}
              unit="L"
              tone="water"
            />
            <div className="mt-3 flex gap-2">
              {[200, 350].map((amount) => (
                <Button key={amount} variant="secondary" className="h-11 flex-1" onClick={() => void drink(amount)}>
                  +{amount} ml
                </Button>
              ))}
            </div>
          </div>
          {totals.incomplete ? <p className="mt-3 text-xs text-subtle">Parte do dia está sem dados completos. O total é parcial.</p> : null}
          {!minor && goals.isEstimate && (goals.source === "GENERIC_REFERENCE" || home.profile.age == null || home.profile.heightCm == null || home.profile.weightKg == null) ? (
            <>
              <p className="mt-3 text-sm">Precisamos de mais informações para personalizar sua meta.</p>
              <p className="mt-1 text-xs text-subtle">Referência geral — não é uma meta personalizada.</p>
            </>
          ) : goals.isEstimate && !minor ? (
            <p className="mt-3 text-xs text-subtle">Referência diária estimada. Não é uma meta obrigatória e não substitui orientação profissional.</p>
          ) : null}
        </section>

        {home.week?.lines?.length ? (
          <section className="mt-4 rounded-3xl bg-card px-4 py-4">
            <h2 className="font-display text-xl font-medium">O que percebi esta semana</h2>
            <ul className="mt-2 space-y-2 text-sm leading-6">
              {home.week.lines.slice(0, 3).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-4 rounded-3xl bg-card px-4 py-4">
          <p className="text-sm leading-6">{insight}</p>
          {idea ? <p className="mt-2 text-sm text-muted">{idea}</p> : null}
        </section>

        <h2 className="mt-8 font-display text-2xl font-medium">Registrar refeição</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Action icon={Camera} label="Foto" onClick={() => navigate({ to: "/registrar", search: { modo: "foto", id: "", manual: false } })} />
          <Action icon={Mic} label="Voz" onClick={() => navigate({ to: "/registrar", search: { modo: "voz", id: "", manual: false } })} />
          <Action icon={PenLine} label="Texto" onClick={() => navigate({ to: "/registrar", search: { modo: "texto", id: "", manual: false } })} />
          <Action icon={Search} label="Buscar alimento" onClick={() => navigate({ to: "/registrar", search: { modo: "busca", id: "", manual: false } })} />
        </div>
        <Button
          variant="ghost"
          className="mt-2 w-full"
          onClick={() => navigate({ to: "/registrar", search: { modo: "codigo", id: "", manual: false } })}
        >
          <ScanBarcode className="size-4" />
          Código de barras
        </Button>
        <p className="mt-2 text-xs text-subtle">
          Análises de foto hoje: {home.usage.image}/{home.usage.limits.image}
        </p>

        <h2 className="mt-8 font-display text-2xl font-medium">Hoje</h2>
        {home.daily ? <p className="mt-1 text-sm text-muted">{home.daily.completeness}</p> : null}
        {home.meals.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nada registrado ainda. Uma refeição já organiza o dia.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {home.meals.map((meal) => (
              <li key={meal.id}>
                <Link
                  to="/diario"
                  className="block rounded-2xl border border-border bg-card px-4 py-3"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{mealLabel(meal.mealType)}</span>
                    <span className="tabular-nums text-sm text-muted">~{Math.round(meal.calories)} kcal</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted">{meal.foods.map((food) => food.name).join(", ")}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}

function Action({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Camera;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press flex h-24 flex-col items-start justify-between rounded-3xl border border-border bg-card p-4 text-left"
    >
      <Icon className="size-5" strokeWidth={1.75} />
      <span className="font-medium">{label}</span>
    </button>
  );
}
