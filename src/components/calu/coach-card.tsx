import { useState } from "react";
import type { CoachAnswer, DailyCoachCard } from "@/lib/calu/daily-coach";
import { Button, Field, controlClass } from "@/components/calu/chrome";

export function CoachCard({
  card,
  busy,
  reply,
  onAction,
  onAsk,
}: {
  card: DailyCoachCard;
  busy: boolean;
  reply: CoachAnswer | null;
  onAction: (card: DailyCoachCard) => void;
  onAsk: (question: string) => void;
}) {
  const [why, setWhy] = useState(false);
  const [question, setQuestion] = useState("");

  return (
    <section className="mt-4 rounded-3xl border border-border bg-card p-4" aria-label="CALU Coach" aria-busy={busy}>
      <h2 className="font-display text-xl font-medium">CALU Coach</h2>
      <p className="mt-2 text-sm leading-6">{card.title}</p>
      <ul className="mt-3 space-y-1 text-sm">
        {card.checks.map((check) => (
          <li key={check.label}>
            <span aria-hidden="true">{check.ok === true ? "✓ " : "• "}</span>
            <span className="sr-only">{check.ok === true ? "Em dia. " : check.ok === false ? "Abaixo da referência. " : ""}</span>
            {check.label}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-6">
        <span className="font-medium">Próximo passo. </span>
        {card.message}
      </p>
      {card.action !== "none" ? (
        <Button className="mt-3 h-11" onClick={() => onAction(card)}>
          {card.actionLabel}
        </Button>
      ) : null}
      <button
        type="button"
        className="mt-3 block h-11 text-sm underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-expanded={why}
        aria-controls="coach-reason"
        onClick={() => setWhy((open) => !open)}
      >
        Por que estou vendo isso?
      </button>
      {why ? (
        <p id="coach-reason" className="mt-2 text-sm leading-6 text-muted">
          {card.reason}
        </p>
      ) : null}
      <form
        className="mt-4 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          const next = question.trim();
          if (next.length < 2 || busy) return;
          onAsk(next);
        }}
      >
        <Field label="Pergunta para o Coach">
          <input
            className={controlClass}
            value={question}
            maxLength={240}
            onChange={(event) => setQuestion(event.target.value)}
          />
        </Field>
        <Button type="submit" variant="secondary" className="h-11" disabled={busy}>
          {busy ? "Analisando seu dia..." : "Perguntar ao Coach"}
        </Button>
      </form>
      <div className="mt-3 text-sm leading-6" aria-live="polite">
        {busy ? <p>Analisando seu dia...</p> : null}
        {reply ? (
          <>
            <p>{reply.message}</p>
            {reply.support && reply.support !== reply.message ? <p className="mt-1 text-muted">{reply.support}</p> : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
