import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listChat, sendChat } from "@/lib/calu/api";
import { friendlyError, todayKey } from "@/lib/calu/client";
import { Boot, Button, Screen, controlClass } from "@/components/calu/chrome";

export const Route = createFileRoute("/calu")({ component: CaluPage });

const SUGGESTIONS = [
  "O que posso comer no jantar?",
  "Como está minha alimentação hoje?",
  "Quais alimentos têm mais proteína?",
  "Me dê uma opção rápida de lanche.",
];

function CaluPage() {
  const { user, isPending } = useCurrentUserState();
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => setDay(todayKey()), []);
  if (isPending || !day) return <Boot />;
  if (!user) return <Navigate to="/login" />;
  return <Chat day={day} />;
}

function Chat({ day }: { day: string }) {
  const [messages, setMessages] = useState<{ id: string; role: string; content: string }[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void listChat()
      .then((result) => {
        if (result.ok) setMessages(result.data.messages);
      })
      .finally(() => setReady(true));
  }, []);

  async function send(message: string) {
    const clean = message.trim();
    if (!clean || busy) return;
    setText("");
    setBusy(true);
    setMessages((curr) => [...curr, { id: crypto.randomUUID(), role: "user", content: clean }]);
    try {
      const result = await sendChat({ data: { message: clean, day } });
      if (!result.ok) toast.error(result.error);
      else setMessages((curr) => [...curr, { id: crypto.randomUUID(), role: "assistant", content: result.data.reply }]);
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <Boot />;

  return (
    <Screen>
      <h1 className="font-display text-3xl font-medium">Converse com a Calu</h1>
      <p className="mt-2 text-sm text-muted">Ela lê o que você registrou hoje. Não prescreve dieta e não substitui um profissional.</p>
      <div className="mt-6 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((item) => (
              <button key={item} type="button" className="rounded-full border border-border bg-card px-3 py-2 text-left text-sm" onClick={() => void send(item)}>
                {item}
              </button>
            ))}
          </div>
        ) : (
          messages.map((message) => (
            <p
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-8 rounded-3xl bg-primary px-4 py-3 text-sm text-primary-foreground"
                  : "mr-6 rounded-3xl bg-card px-4 py-3 text-sm leading-6"
              }
            >
              {message.content}
            </p>
          ))
        )}
        {busy ? <p className="text-sm text-muted">Calu está lendo o dia...</p> : null}
      </div>
      <form
        className="mt-6 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(text);
        }}
      >
        <input className={controlClass} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva para a Calu" />
        <Button type="submit" disabled={busy} className="shrink-0">
          Enviar
        </Button>
      </form>
      <p className="mt-4 text-xs text-subtle">Diga “lembre que…” para guardar uma preferência. Você pode apagar isso no perfil.</p>
    </Screen>
  );
}
