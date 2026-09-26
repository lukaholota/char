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

export function updateUrlSearchParams(mutate: (next: URLSearchParams) => void) {
  const next = getSearchParamsFromLocation();
  mutate(next);
  replaceUrlSearchParams(next);
}

export function replaceUrlSearchParams(next: URLSearchParams) {
  if (typeof window === "undefined") return;
  const search = next.toString();
  const newUrl = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
  window.history.replaceState(window.history.state, "", newUrl);
}


/// Режим вбудовування: каталог відкритий в iframe із листа персонажа й малює кнопку «додати»
/// замість самої лише картки. `persId` без нього нічого не значить — обидва або жодного.
export type CatalogEmbed = { persId: number; persName: string | null };

export function findCatalogEmbed(params: URLSearchParams): CatalogEmbed | null {
  if (params.get("origin") !== "character") return null;

  const persId = Number(params.get("persId"));
  if (!Number.isInteger(persId) || persId <= 0) return null;

  return { persId, persName: params.get("persName") };
}

export function buildCatalogEmbedParams(input: { persId: number; persName?: string }): string {
  const params = new URLSearchParams({ origin: "character", persId: String(input.persId) });
  if (input.persName) params.set("persName", input.persName);

  return params.toString();
}
