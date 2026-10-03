import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Home, MessageCircle, TrendingUp, User } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="10" className="fill-primary" />
      <path
        d="M9.5 18.5c1.2 3 3.6 4.6 6.5 4.6s5.3-1.6 6.5-4.6"
        fill="none"
        stroke="#fff8f4"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M11 14.5h10" stroke="#fff8f4" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const buttonStyles = {
  primary: "bg-primary text-primary-foreground",
  secondary: "border border-border bg-card text-foreground",
  ghost: "bg-transparent text-foreground",
  danger: "bg-transparent text-danger",
} as const;

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles }) {
  return (
    <button
      type={type}
      className={cn(
        "press inline-flex h-12 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium disabled:opacity-50",
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

export const controlClass =
  "h-12 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-primary/30";

export function Meter({
  label,
  value,
  goal,
  unit,
  tone = "primary",
}: {
  label: string;
  value: number;
  goal: number;
  unit: string;
  tone?: "primary" | "water";
}) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  const shown = Number.isInteger(value) ? value : value.toFixed(1).replace(".", ",");
  const goalShown = Number.isInteger(goal) ? goal : goal.toFixed(1).replace(".", ",");
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted">{label}</span>
        <span className="tabular-nums text-sm font-medium">
          {shown} / {goalShown} {unit}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
        <div
          className={cn("h-full rounded-full", tone === "water" ? "bg-water" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const TABS = [
  { to: "/", label: "Início", icon: Home },
  { to: "/diario", label: "Diário", icon: BookOpen },
  { to: "/progresso", label: "Progresso", icon: TrendingUp },
  { to: "/calu", label: "Calu", icon: MessageCircle },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function Shell({ children, title }: { children: ReactNode; title?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col border-border bg-background md:border-x">
        <header className="flex items-center gap-3 px-5 pt-5">
          <Mark className="size-9 shrink-0" />
          <div className="min-w-0">
            <p className="font-display text-lg leading-none font-medium tracking-tight">CALU</p>
            {title ? <p className="mt-1 truncate text-sm text-muted">{title}</p> : null}
          </div>
        </header>
        <main className="flex-1 px-5 pt-6 pb-28">{children}</main>
        <nav
          className="fixed bottom-0 left-1/2 z-20 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-background/95"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          aria-label="Principal"
        >
          <ul className="grid grid-cols-5">
            {TABS.map((tab) => {
              const active = tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
              const Icon = tab.icon;
              return (
                <li key={tab.to}>
                  <Link
                    to={tab.to}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-16 flex-col items-center justify-center gap-1 text-xs",
                      active ? "text-primary" : "text-subtle",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-background px-5 py-8 md:border-x md:border-border">
        {children}
      </div>
    </div>
  );
}

export function Boot() {
  return (
    <Screen>
      <Mark className="size-12" />
      <h1 className="mt-6 font-display text-4xl font-medium tracking-tight">CALU</h1>
      <p className="mt-2 text-muted">Seu acompanhamento alimentar inteligente.</p>
    </Screen>
  );
}
