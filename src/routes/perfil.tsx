import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  addMemory,
  askInsight,
  deleteAccountData,
  deleteHistory,
  deleteMemory,
  exportData,
  getHome,
  saveGoals,
  saveProfile,
  setNotifications,
  track,
  type HomeData,
} from "@/lib/calu/api";
import { friendlyError, todayKey } from "@/lib/calu/client";
import { estimateGoals } from "@/lib/calu/domain";
import { Boot, Button, Field, Shell, controlClass } from "@/components/calu/chrome";
import { ProfileFields, emptyProfileForm, toProfilePayload, type ProfileFormValue } from "@/components/calu/profile-form";

export const Route = createFileRoute("/perfil")({ component: ProfilePage });

function ProfilePage() {
  const { user, isPending } = useCurrentUserState();
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => setDay(todayKey()), []);
  if (isPending || !day) return <Boot />;
  if (!user) return <Navigate to="/login" />;
  return <ProfileBody day={day} />;
}

function ProfileBody({ day }: { day: string }) {
  const navigate = useNavigate();
  const [home, setHome] = useState<HomeData | null>(null);
  const [form, setForm] = useState<ProfileFormValue>(emptyProfileForm());
  const [goals, setGoals] = useState({ calories: "", protein: "", carbohydrates: "", fat: "", fiber: "", waterMl: "" });
  const [fact, setFact] = useState("");
  const [insight, setInsight] = useState("");
  const [confirm, setConfirm] = useState<"history" | "account" | null>(null);

  useEffect(() => {
    void track({ data: "subscription_screen_opened" }).catch(() => undefined);
    void getHome({ data: { day } }).then((result) => {
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
      });
      if (result.data.goals) {
        const g = result.data.goals;
        setGoals({
          calories: String(g.calories),
          protein: String(g.protein),
          carbohydrates: String(g.carbohydrates),
          fat: String(g.fat),
          fiber: String(g.fiber),
          waterMl: String(g.waterMl),
        });
      }
    });
  }, [day]);

  if (!home) return <Boot />;
  if (!home.profile) return <Navigate to="/comecar" />;

  const estimate = estimateGoals(toProfilePayload(form, true));

  return (
    <Shell title="Sua conta">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-medium">Perfil</h1>
        <UserButton />
      </div>
      <div className="mt-6">
        <ProfileFields value={form} onChange={setForm} />
        <Button
          className="mt-4 w-full"
          onClick={() =>
            void saveProfile({ data: toProfilePayload(form, false) })
              .then((result) => toast[result.ok ? "success" : "error"](result.ok ? "Perfil atualizado." : result.error))
              .catch((error) => toast.error(friendlyError(error)))
          }
        >
          Salvar perfil
        </Button>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-medium">Metas</h2>
        <p className="mt-1 text-sm text-muted">{estimate.note}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(
            [
              ["calories", "Calorias"],
              ["protein", "Proteína (g)"],
              ["carbohydrates", "Carboidratos (g)"],
              ["fat", "Gorduras (g)"],
              ["fiber", "Fibras (g)"],
              ["waterMl", "Água (ml)"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input className={controlClass} inputMode="decimal" value={goals[key]} onChange={(e) => setGoals({ ...goals, [key]: e.target.value })} />
            </Field>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() =>
              void saveProfile({ data: toProfilePayload(form, true) }).then(async (result) => {
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
                      waterMl: String(g.waterMl),
                    });
                  }
                  toast.success("Metas reestimadas.");
                }
              })
            }
          >
            Reestimar
          </Button>
          <Button
            className="flex-1"
            onClick={() =>
              void saveGoals({
                data: {
                  calories: Number(goals.calories),
                  protein: Number(goals.protein),
                  carbohydrates: Number(goals.carbohydrates),
                  fat: Number(goals.fat),
                  fiber: Number(goals.fiber),
                  waterMl: Number(goals.waterMl),
                },
              }).then((result) => toast[result.ok ? "success" : "error"](result.ok ? "Metas salvas." : result.error))
            }
          >
            Salvar metas
          </Button>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-medium">Memória</h2>
        <p className="mt-1 text-sm text-muted">Só entra o que você escrever. Visível, editável e apagável.</p>
        <ul className="mt-3 space-y-2">
          {home.memory.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border px-3 py-3 text-sm">
              <span>{item.fact}</span>
              <button
                type="button"
                className="shrink-0 text-danger"
                onClick={() =>
                  void deleteMemory({ data: item.id }).then(() =>
                    setHome({ ...home, memory: home.memory.filter((m) => m.id !== item.id) }),
                  )
                }
              >
                Apagar
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void addMemory({ data: fact }).then((result) => {
              if (!result.ok) toast.error(result.error);
              else {
                setHome({ ...home, memory: [{ id: result.data.id, fact }, ...home.memory] });
                setFact("");
              }
            });
          }}
        >
          <input className={controlClass} value={fact} onChange={(e) => setFact(e.target.value)} placeholder="Prefere café da manhã simples" />
          <Button type="submit" className="shrink-0">
            Guardar
          </Button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-medium">Notificações</h2>
        <p className="mt-1 text-sm text-muted">Lembretes discretos só com o app aberto. Dá para desligar tudo.</p>
        <label className="mt-3 flex items-center justify-between rounded-2xl border border-border px-4 py-3">
          <span>Lembretes</span>
          <input
            type="checkbox"
            checked={home.notifications}
            onChange={(e) =>
              void setNotifications({ data: e.target.checked }).then((result) => {
                if (result.ok) setHome({ ...home, notifications: result.data.enabled });
              })
            }
          />
        </label>
        {home.notifications && !home.meals.some((m) => m.mealType === "lunch") && new Date().getHours() >= 11 && new Date().getHours() <= 14 ? (
          <p className="mt-3 text-sm">Quer registrar seu almoço?</p>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-medium">Plano</h2>
        <p className="mt-2 text-sm leading-6">
          Gratuito: diário, registro manual e {home.usage.limits.image} análises de foto por dia. Premium, quando a cobrança existir: mais análises, coach e histórico longo. Não há pagamento nesta versão.
        </p>
        <p className="mt-2 text-sm text-muted">Seu plano agora: {home.profile.plan === "premium" ? "Premium" : "Gratuito"}.</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-medium">Um olhar da Calu</h2>
        <Button
          variant="secondary"
          className="mt-3 w-full"
          onClick={() =>
            void askInsight({ data: { day } }).then((result) => {
              if (!result.ok) toast.error(result.error);
              else setInsight(result.data.insight);
            })
          }
        >
          Pedir um insight do dia
        </Button>
        {insight ? <p className="mt-3 text-sm leading-6">{insight}</p> : null}
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl font-medium">Seus dados</h2>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() =>
            void exportData()
              .then((result) => {
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
              })
              .catch((error) => toast.error(friendlyError(error)))
          }
        >
          Exportar dados
        </Button>
        {confirm === "history" ? (
          <Button
            variant="danger"
            className="w-full"
            onClick={() =>
              void deleteHistory().then((result) => {
                if (!result.ok) toast.error(result.error);
                else {
                  toast.success("Histórico apagado.");
                  setConfirm(null);
                }
              })
            }
          >
            Apagar histórico agora
          </Button>
        ) : (
          <Button variant="ghost" className="w-full" onClick={() => setConfirm("history")}>
            Excluir histórico alimentar
          </Button>
        )}
        {confirm === "account" ? (
          <Button
            variant="danger"
            className="w-full"
            onClick={() =>
              void deleteAccountData().then(async (result) => {
                if (!result.ok) toast.error(result.error);
                else await navigate({ to: "/comecar" });
              })
            }
          >
            Apagar dados do CALU
          </Button>
        ) : (
          <Button variant="ghost" className="w-full" onClick={() => setConfirm("account")}>
            Excluir dados da conta
          </Button>
        )}
        <p className="text-xs text-subtle">
          Apagar os dados remove perfil, diário, memória e conversas deste app. O acesso da conta pode permanecer no provedor de login.
        </p>
        <p className="text-sm">
          <Link to="/privacidade" className="underline">
            Política de Privacidade
          </Link>
          {" · "}
          <Link to="/termos" className="underline">
            Termos de Uso
          </Link>
        </p>
      </section>
    </Shell>
  );
}
