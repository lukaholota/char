/// Новий рядок має тимчасовий від'ємний id, а повернений скасуванням — новий справжній: старі кроки історії шукають його за ланцюжком.
export function createIdChain() {
  const nextIdById = new Map<number, number>();
  let lastTempId = 0;
  const findCurrentId = (id: number): number => {
    let current = id;
    while (nextIdById.has(current)) current = nextIdById.get(current)!;
    return current;
  };
  return { findCurrentId, takeTempId: () => --lastTempId, link: (from: number, to: number) => void nextIdById.set(from, to) };
}
