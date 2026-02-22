export function nowIso(): string {
  return new Date().toISOString();
}

export function ttlSeconds(ttlDays: number): number {
  const now = Math.floor(Date.now() / 1000);
  return now + ttlDays * 86400;
}
