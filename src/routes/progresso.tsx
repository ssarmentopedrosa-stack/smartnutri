import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getProgress, saveHabits, saveWeight, toggleCheck, getHome, type HomeData } from "@/lib/calu/api";
import { friendlyError, todayKey } from "@/lib/calu/client";
import { summarizeHistory } from "@/lib/calu/domain";
import { Boot, Button, Shell, controlClass } from "@/components/calu/chrome";

export const Route = createFileRoute("/progresso")({ component: ProgressPage });

const SPANS = [
  { id: 1, label: "Hoje" },
  { id: 7, label: "7 dias" },
  { id: 30, label: "30 dias" },
  { id: 90, label: "90 dias" },
] as const;

function ProgressPage() {
  const { user, isPending } = useCurrentUserState();
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => setDay(todayKey()), []);
  if (isPending || !day) return <Boot />;
  if (!user) return <Navigate to="/login" />;
  return <ProgressBody day={day} />;
}

function ProgressBody({ day }: { day: string }) {
  const [span, setSpan] = useState<(typeof SPANS)[number]["id"]>(7);
  const [data, setData] = useState<Awaited<ReturnType<typeof load>> | null>(null);
  const [home, setHome] = useState<HomeData | null>(null);
  const [weight, setWeight] = useState("");

  async function load(nextSpan = span) {
    const result = await getProgress({ data: { endDay: day, span: nextSpan } });
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }

  useEffect(() => {
    void load(span)
      .then(setData)
      .catch((error) => toast.error(friendlyError(error)));
    void getHome({ data: { day } }).then((result) => {
      if (result.ok) setHome(result.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, span]);

  if (!data || !home) return <Boot />;
  if (!home.profile) return <Navigate to="/comecar" />;

  const summary = summarizeHistory({ span, meals: data.meals, waterByDay: data.water });
  const chart = data.weights.map((point) => ({ ...point, label: point.day.slice(5) }));

  async function habits(next: HomeData["habits"]) {
    setHome({ ...home!, habits: next });
    const result = await saveHabits({ data: next });
    if (!result.ok) toast.error(result.error);
  }

  return (
    <Shell title="Seu dia, em perspectiva">
      <h1 className="font-display text-3xl font-medium">Progresso</h1>
      <div className="mt-4 flex gap-2">
        {SPANS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSpan(item.id)}
            className={
              span === item.id
                ? "h-10 rounded-full bg-primary px-3 text-sm text-primary-foreground"
                : "h-10 rounded-full border border-border px-3 text-sm"
            }
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm leading-6">{summary.narrative}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Média de calorias" value={summary.avgCalories == null ? "—" : String(summary.avgCalories)} />
        <Stat label="Média de proteína" value={summary.avgProtein == null ? "—" : `${summary.avgProtein} g`} />
        <Stat label="Dias registrados" value={`${summary.recordedDays}`} />
        <Stat label="Água média" value={summary.avgWater == null ? "—" : `${summary.avgWater} ml`} />
      </div>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-medium">Peso</h2>
        <p className="mt-1 text-sm text-muted">Não é necessário pesar-se diariamente.</p>
        {chart.length > 1 ? (
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid stroke="#e3d8cb" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#5e534a", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} hide />
                <Tooltip formatter={(value) => [`${value} kg`, "Peso"]} />
                <Line type="monotone" dataKey="kg" stroke="#8c3b22" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            {chart[0] ? `Último registro: ${chart[0].kg} kg.` : "Quando você registrar um peso, ele aparece aqui."}
          </p>
        )}
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void saveWeight({ data: { day, weightKg: Number(weight.replace(",", ".")) } })
              .then(async (result) => {
                if (!result.ok) toast.error(result.error);
                else {
                  setWeight("");
                  setData(await load(span));
                }
              })
              .catch((error) => toast.error(friendlyError(error)));
          }}
        >
          <input className={controlClass} inputMode="decimal" placeholder="kg" value={weight} onChange={(e) => setWeight(e.target.value)} />
          <Button type="submit" className="shrink-0">
            Registrar
          </Button>
        </form>
      </section>
      <section className="mt-8">
        <h2 className="font-display text-2xl font-medium">Hábitos</h2>
        <p className="mt-1 text-sm text-muted">Opcional. Desligue o que não quiser acompanhar.</p>
        <div className="mt-3 space-y-2">
          {(
            [
              ["water", "Água"],
              ["produce", "Frutas e vegetais"],
              ["meals", "Refeições registradas"],
              ["activity", "Atividade"],
              ["sleep", "Sono"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={home.habits[key]}
                onChange={(e) => void habits({ ...home.habits, [key]: e.target.checked })}
              />
            </label>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {home.habits.produce ? (
            <Check
              label="Comi frutas ou vegetais hoje"
              done={home.checks.some((c) => c.habit === "produce" && c.done)}
              onChange={(done) => void toggleCheck({ data: { day, habit: "produce", done } })}
            />
          ) : null}
          {home.habits.activity ? (
            <Check
              label="Me movimentei hoje"
              done={home.checks.some((c) => c.habit === "activity" && c.done)}
              onChange={(done) => void toggleCheck({ data: { day, habit: "activity", done } })}
            />
          ) : null}
          {home.habits.sleep ? (
            <Check
              label="Dormi o suficiente para mim"
              done={home.checks.some((c) => c.habit === "sleep" && c.done)}
              onChange={(done) => void toggleCheck({ data: { day, habit: "sleep", done } })}
            />
          ) : null}
        </div>
      </section>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl tabular-nums">{value}</p>
    </div>
  );
}

function Check({ label, done, onChange }: { label: string; done: boolean; onChange: (done: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <input type="checkbox" checked={done} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
