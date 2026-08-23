/// Drops empty and missing values so optional statblock fields never land in a generated
/// catalog as noise keys. Shared by the static builder and the DB-sourced generator.
export function keepFilled(
  fields: Record<string, string | null | undefined>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fields).filter(
      (entry): entry is [string, string] =>
        entry[1] !== null && entry[1] !== undefined && entry[1] !== ""
    )
  );
}
