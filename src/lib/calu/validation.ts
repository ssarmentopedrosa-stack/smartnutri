export function parseAge(value: unknown): number | null {
  if (value === "" || value == null) return null;
  const age = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(age) || age < 13 || age > 120) {
    throw new Error("Idade entre 13 e 120, ou deixe em branco.");
  }
  return age;
}

export function parseNotificationEnabled(value: unknown): boolean {
  if (value === true || value === false) return value;
  throw new Error("Informe se as notificações ficam ligadas ou desligadas.");
}
export function assertNotFutureDay(day: string, today: string): string {
  const parsed = parseDay(day);
  const current = parseDay(today);
  if (parsed > current) throw new Error("Data futura não pode ser registrada.");
  return parsed;
}

export function parseDay(value: unknown): string {
  const day = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Data inválida.");
  const [year, month, date] = day.split("-").map(Number);
  const parsed = new Date(Date.UTC(year!, month! - 1, date));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month! - 1 ||
    parsed.getUTCDate() !== date
  ) {
    throw new Error("Data inválida.");
  }
  return day;
}

export function parseEntityId(value: unknown): string {
  const id = String(value ?? "");
  if (!/^[0-9a-f-]{16,40}$/i.test(id)) throw new Error("Registro inválido.");
  return id;
}

export function parseBarcode(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 14) throw new Error("Código inválido.");
  return digits;
}

export function parseImageBase64(value: unknown): string {
  let image = String(value ?? "");
  const embedded = image.match(/base64,([A-Za-z0-9+/=\s]+)$/);
  if (embedded) image = embedded[1] ?? "";
  image = image.replace(/\s/g, "");
  if (image.length < 80 || image.length > 1_400_000 || !/^[A-Za-z0-9+/=]+$/.test(image)) {
    throw new Error("Não consegui ler essa foto. Tente outra, mais próxima e em JPG.");
  }
  const jpeg = image.startsWith("/9j/");
  const png = image.startsWith("iVBOR");
  const webp = image.startsWith("UklGR");
  if (!jpeg && !png && !webp) {
    throw new Error("Use uma foto JPG, PNG ou WEBP.");
  }
  return image;
}

export function assertOwned(rowUserId: string | null | undefined, authUserId: string): boolean {
  return Boolean(rowUserId) && rowUserId === authUserId;
}
