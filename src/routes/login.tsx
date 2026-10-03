import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { GROK_PROVIDERS, authClient, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Boot, Button, Field, Mark, Screen, controlClass } from "@/components/calu/chrome";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isPending) return <Boot />;
  if (user) return <Navigate to="/" />;

  async function submit() {
    setBusy(true);
    setError("");
    const result =
      mode === "up"
        ? await authClient.signUp.email({ email, password, name: name || "Você", callbackURL: "/" })
        : await authClient.signIn.email({ email, password, callbackURL: "/" });
    setBusy(false);
    if (result.error) {
      const message = result.error.message ?? "";
      if (/exist/i.test(message)) setError("Já existe uma conta com esse e-mail. Entre com a senha.");
      else if (/password|invalid|credential/i.test(message)) setError("E-mail ou senha não conferem.");
      else setError("Não consegui entrar agora. Tente de novo.");
      return;
    }
    window.location.assign("/");
  }

  return (
    <Screen>
      <div className="rise">
        <Mark className="size-12" />
        <h1 className="mt-6 font-display text-4xl leading-tight font-medium tracking-tight">Entre no CALU</h1>
        <p className="mt-2 text-muted">Seu diário fica só na sua conta. A Calu estima. Você confirma.</p>
        <div className="mt-8 space-y-3">
          {GROK_PROVIDERS.map((provider) => (
            <Button
              key={provider.providerId}
              variant="secondary"
              className="w-full"
              onClick={() => signIn(provider.providerId, { callbackURL: "/" })}
            >
              Continuar com {provider.label}
            </Button>
          ))}
        </div>
        <div className="my-6 h-px bg-border" />
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {mode === "up" ? (
            <Field label="Nome">
              <input className={controlClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
          ) : null}
          <Field label="E-mail">
            <input className={controlClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </Field>
          <Field label="Senha">
            <input className={controlClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "up" ? "new-password" : "current-password"} minLength={8} required />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Aguarde" : mode === "up" ? "Criar conta" : "Entrar"}
          </Button>
        </form>
        <button type="button" className="mt-4 text-sm text-muted" onClick={() => setMode(mode === "up" ? "in" : "up")}>
          {mode === "up" ? "Já tenho conta" : "Criar uma conta"}
        </button>
      </div>
    </Screen>
  );
}
