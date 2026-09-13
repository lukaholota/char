/**
 * Порядок ключів у записі фічі — не косметика. Проходи лічильників
 * (`parse-class-feature-uses.ts`, `parse-subclass-feature-uses.ts`) дописують свої `displayType`
 * і `uses` **останніми** й звіряють текст файлу дослівно, тож ключ, доданий у хвіст іншим
 * проходом, зробив би два проходи несумісними. Тому все нове стає одразу після назви.
 */

type NamedFeature = { name: string; [key: string]: unknown };

export function withFieldAfterName<T extends NamedFeature>(feature: T, field: string, value: unknown): T {
  const rebuilt: Record<string, unknown> = {};
  for (const [key, existing] of Object.entries(feature)) {
    if (key === field) continue;
    rebuilt[key] = existing;
    if (key === "name") rebuilt[field] = value;
  }

  return rebuilt as T;
}

export function withoutField<T extends NamedFeature>(feature: T, field: string): T {
  const { [field]: _dropped, ...rest } = feature;
  return rest as T;
}
