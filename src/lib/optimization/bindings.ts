import type { ClassData, SubclassData } from "@/lib/classesData";
import type { Class } from "@prisma/client";
import type { EntityBinding, EntityRef } from "./types";

export function entityIdentity(entity: EntityRef): string {
  return JSON.stringify([entity.ruleset, entity.kind, entity.parentKey ?? null, entity.entityKey]);
}

function isSameEntity(left: EntityRef, right: EntityRef) {
  return left.entityKey === right.entityKey && left.kind === right.kind && left.ruleset === right.ruleset
    && (left.parentKey ?? null) === (right.parentKey ?? null);
}

export function catalogSubclassEntity(parent: Pick<ClassData, "key" | "ruleset">,
  subclass: Pick<SubclassData, "key">): EntityRef {
  return { ruleset: parent.ruleset, kind: "subclass", parentKey: parent.key, entityKey: subclass.key };
}

export function constructorSubclassEntity(parent: Pick<Class, "name" | "ruleset">,
  subclass: { name: string }): EntityRef {
  return { ruleset: parent.ruleset, kind: "subclass", parentKey: parent.name, entityKey: subclass.name };
}

export function resolvePrimaryBinding(bindings: readonly EntityBinding[], entity: EntityRef) {
  const candidates = bindings.filter((binding) => isSameEntity(binding.entity, entity));
  const primaries = candidates.filter((binding) => binding.primary);
  if (!candidates.length) return { status: "missing" as const, candidates };
  if (primaries.length !== 1) return { status: "ambiguous" as const, candidates };
  return { status: "resolved" as const, binding: primaries[0], candidates };
}
