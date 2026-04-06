const FALLBACK_NEXT_PATH = "/";

export function normalizeNextPath(
  value: string | null | undefined,
  fallback = FALLBACK_NEXT_PATH,
) {
  const trimmed = (value ?? "").trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  return trimmed;
}

export function buildLoginUrl(pathname: string, nextPath: string) {
  const url = new URL(pathname, "https://local.invalid");
  url.searchParams.set("next", normalizeNextPath(nextPath));
  return `${url.pathname}${url.search}`;
}
