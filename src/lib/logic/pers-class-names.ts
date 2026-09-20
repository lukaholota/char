type NamedRow = { name: string } | null | undefined;

export type PersClassSource = {
  class: NamedRow;
  subclass?: NamedRow;
  multiclasses?: readonly { class: NamedRow; subclass?: NamedRow }[] | null;
};

export function collectPersClassNames(pers: PersClassSource): string[] {
  return collectNames([pers.class, ...(pers.multiclasses ?? []).map((multiclass) => multiclass.class)]);
}

export function collectPersSubclassNames(pers: PersClassSource): string[] {
  return collectNames([pers.subclass, ...(pers.multiclasses ?? []).map((multiclass) => multiclass.subclass)]);
}

function collectNames(rows: readonly NamedRow[]): string[] {
  return rows.flatMap((row) => (row?.name ? [row.name] : []));
}
