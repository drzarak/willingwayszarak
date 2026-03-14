const WILLING_WAYS_HOSTS = new Set(["willingways.org", "www.willingways.org"]);

export function normalizePathname(pathname: string) {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function normalizeWillingWaysHref(href?: string | null) {
  if (!href) {
    return null;
  }

  if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return href;
  }

  try {
    const absolute = new URL(href, "https://www.willingways.org");

    if (WILLING_WAYS_HOSTS.has(absolute.hostname)) {
      const pathname = normalizePathname(absolute.pathname);
      return absolute.search ? `${pathname}${absolute.search}` : pathname;
    }

    return absolute.toString();
  } catch {
    return href;
  }
}

export function isInternalWillingWaysHref(href?: string | null) {
  if (!href) {
    return false;
  }

  if (href.startsWith("/")) {
    return true;
  }

  try {
    const absolute = new URL(href, "https://www.willingways.org");
    return WILLING_WAYS_HOSTS.has(absolute.hostname);
  } catch {
    return false;
  }
}
