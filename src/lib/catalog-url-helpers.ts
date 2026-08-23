/**
 * Common URL search parameters helpers for catalog pages (Spells, Items, Feats, Bestiary).
 */

export function getParamSet(params: URLSearchParams, key: string): Set<string> {
  const raw = params.get(key);
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
  );
}

export function setParamSet(params: URLSearchParams, key: string, values: Set<string>) {
  const nextValues = Array.from(values).filter(Boolean);
  if (nextValues.length === 0) {
    params.delete(key);
  } else {
    params.set(key, nextValues.join(","));
  }
}

export function getSearchParamsFromLocation(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export function getBoolParam(params: URLSearchParams, key: string): boolean | null {
  const raw = params.get(key);
  if (raw === null) return null;
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return null;
}

export function setBoolParam(params: URLSearchParams, key: string, value: boolean | null) {
  if (value === null) {
    params.delete(key);
  } else {
    params.set(key, value ? "1" : "0");
  }
}

export function replaceUrlSearchParams(next: URLSearchParams) {
  if (typeof window === "undefined") return;
  const search = next.toString();
  const newUrl = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", newUrl);
}

