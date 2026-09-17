export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getClientId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("mamss-client");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("mamss-client", id);
  }
  return id;
}
