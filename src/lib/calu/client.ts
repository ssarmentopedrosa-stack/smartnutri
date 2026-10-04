import { dayKeyInTimeZone, isValidTimeZone } from "./timezone.ts";
import type { FoodDraft } from "./domain";

const QUEUE = "calu.queue.v2";
const CACHE = "calu.cache.v2";

export type MealPayload = {
  id: string;
  day: string;
  mealType: string;
  eatenAt: string;
  source: string;
  note: string;
  uncertainties: string[];
  insight: string;
  foods: FoodDraft[];
};

const ZONE_KEY = "calu.timezone";

export function rememberTimeZone(timeZone: string) {
  if (!isValidTimeZone(timeZone)) return;
  try {
    sessionStorage.setItem(ZONE_KEY, timeZone);
  } catch {
    /* ambiente sem storage */
  }
}

function rememberedTimeZone(): string | undefined {
  try {
    const value = sessionStorage.getItem(ZONE_KEY);
    return value && isValidTimeZone(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function todayKey(date = new Date(), timeZone?: string): string {
  const zone = timeZone || rememberedTimeZone();
  if (zone && isValidTimeZone(zone)) return dayKeyInTimeZone(date, zone);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Remove diário e fila locais. O banco continua sendo a fonte de verdade. */
export function clearPrivateCache(): void {
  try {
    localStorage.removeItem(QUEUE);
    localStorage.removeItem(CACHE);
    sessionStorage.removeItem("calu.open");
  } catch {
    /* ambiente sem storage */
  }
}

export function shiftDay(day: string, delta: number): string {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return todayKey(date);
}

export function friendlyError(error: unknown): string {
  const msg = error instanceof Error ? error.message : "";
  if (/unauthorized/i.test(msg)) return "Sua sessão expirou. Entre de novo para continuar.";
  if (/failed to fetch|network|offline|load failed/i.test(msg)) return "Sem conexão no momento.";
  if (msg && msg.length < 180 && !/sql|postgres|syntax/i.test(msg)) return msg;
  return "Algo não saiu como esperado. Tente outra vez.";
}

export function isOfflineError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return /failed to fetch|network|offline|load failed|sem conexão/i.test(msg);
}

export function readQueue(userId: string): MealPayload[] {
  try {
    const raw = localStorage.getItem(QUEUE);
    const parsed = raw ? (JSON.parse(raw) as { userId?: string; meals?: MealPayload[] }) : null;
    if (!parsed || parsed.userId !== userId || !Array.isArray(parsed.meals)) return [];
    return parsed.meals;
  } catch {
    return [];
  }
}

export function enqueueMeal(userId: string, meal: MealPayload) {
  const queue = readQueue(userId).filter((item) => item.id !== meal.id);
  queue.push(meal);
  localStorage.setItem(QUEUE, JSON.stringify({ userId, meals: queue }));
}

export function dropQueued(userId: string, id: string) {
  localStorage.setItem(QUEUE, JSON.stringify({ userId, meals: readQueue(userId).filter((item) => item.id !== id) }));
}

export function cacheHome(userId: string, day: string, data: unknown) {
  try {
    const current = JSON.parse(localStorage.getItem(CACHE) || "{}") as { userId?: string; days?: Record<string, unknown> };
    const days = current.userId === userId ? (current.days ?? {}) : {};
    days[day] = data;
    localStorage.setItem(CACHE, JSON.stringify({ userId, days }));
  } catch {
    /* cache cheio ou indisponível */
  }
}

export function readCachedHome<T>(userId: string, day: string): T | null {
  try {
    const current = JSON.parse(localStorage.getItem(CACHE) || "{}") as { userId?: string; days?: Record<string, T> };
    if (current.userId !== userId) return null;
    return current.days?.[day] ?? null;
  } catch {
    return null;
  }
}

export function compressImage(file: File): Promise<string> {
  if (file.size > 8_000_000) {
    return Promise.reject(new Error("Essa foto é grande demais. Tente outra mais próxima, em JPG."));
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const max = 1280;
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Não consegui preparar a foto."));
        return;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.72);
      URL.revokeObjectURL(url);
      resolve(data.split(",")[1] ?? "");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não consegui ler essa foto. Tente outra em JPG."));
    };
    image.src = url;
  });
}
