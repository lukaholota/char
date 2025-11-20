export const groupBy = <
  V, K extends string | symbol | number
>(items: V[], keyFn: (item: V) => K): Record<K, V[]> =>
  items.reduce((acc, cur) => {
    const key = keyFn(cur);
    (acc[key] ??= []).push(cur);
    return acc;
  }, {} as Record<K, V[]>)