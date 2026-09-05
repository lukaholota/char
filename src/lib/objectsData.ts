import objects from "./generated/objects.json";
import { GeneratedObjectStatblock } from "./objectTypes";
import { Ruleset } from "@prisma/client";

const OBJECTS = objects as unknown as GeneratedObjectStatblock[];

export function getObjects(ruleset: Ruleset): GeneratedObjectStatblock[] {
  return OBJECTS.filter((article) => article.ruleset === ruleset).sort((a, b) => a.order - b.order);
}
