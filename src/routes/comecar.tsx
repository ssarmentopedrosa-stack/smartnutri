import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { saveProfile, track } from "@/lib/calu/api";
import { friendlyError } from "@/lib/calu/client";
import { Boot, Button, Mark, Screen } from "@/components/calu/chrome";
import { ProfileFields, emptyProfileForm, toProfilePayload } from "@/components/calu/profile-form";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/comecar")({ component: StartPage });

const SLIDES = [
  {
    title: "Conheça a Calu",
    body: "Uma IA para ajudar você a entender sua alimentação. Não é nutricionista e não é médica.",
  },
  {
    title: "Registre sem complicação",
    body: "Foto, voz ou texto. Poucos passos, sem dezenas de campos.",
  },
  {
    title: "Veja seus hábitos",
    body: "Entenda sua alimentação ao longo do tempo, sem nota e sem competição.",
  },
  {
    title: "Você continua no controle",
    body: "A IA faz estimativas. Você confirma e corrige. Só o que você confirmar entra no diário.",
  },
];

function StartPage() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => emptyProfileForm());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void track({ data: "onboarding_started" }).catch(() => undefined);
  }, []);

  if (isPending) return <Boot />;
  if (!user) return <Navigate to="/login" />;

  async function finish() {
    setBusy(true);
    try {
      const result = await saveProfile({ data: toProfilePayload({ ...form, name: form.name || user?.displayName || "" }, true) });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await navigate({ to: "/" });
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Mark className="size-12" />
      {step < SLIDES.length ? (
        <div className="rise mt-10" key={step}>
          <p className="text-sm text-muted">
            {step + 1} / {SLIDES.length}
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight font-medium tracking-tight">{SLIDES[step]?.title}</h1>
          <p className="mt-4 text-lg text-muted">{SLIDES[step]?.body}</p>
          <div className="mt-10 flex gap-3">
            {step > 0 ? (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                Voltar
              </Button>
            ) : null}
            <Button className="flex-1" onClick={() => setStep(step + 1)}>
              Continuar
            </Button>
          </div>
          <button type="button" className="mt-4 text-sm text-muted" onClick={() => setStep(SLIDES.length)}>
            Pular introdução
          </button>
        </div>
      ) : (
        <div className="rise mt-8">
          <h1 className="font-display text-3xl font-medium tracking-tight">Seu perfil</h1>
          <p className="mt-2 text-muted">Usamos isso só para estimar metas. Você pode editar ou apagar depois.</p>
          <div className="mt-6">
            <ProfileFields value={form} onChange={setForm} showConsent />
          </div>
          <p className="mt-4 text-sm text-muted">
            <Link to="/privacidade" className="underline">
              Política
            </Link>
            {" · "}
            <Link to="/termos" className="underline">
              Termos
            </Link>
          </p>
          <Button className="mt-6 w-full" disabled={busy} onClick={() => void finish()}>
            {busy ? "Salvando" : "Começar"}
          </Button>
        </div>
      )}
    </Screen>
  );
}
