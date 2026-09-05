import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/// KR22.4. Список каталогу стає динамічним від одного `await searchParams` — навіть якщо запит
/// потрібен лише для початкового стану фільтра, який клієнт усе одно перечитує з адреси при
/// монтуванні. Так було з усіма 18 списками: сервер малював 959 істот на кожен запит, сторінка
/// не пререндерилась і не лягала в кеш. Гейт не дає повернути це непомітно.

const APP = join(process.cwd(), "src/app");

const STATIC_LISTS = [
  "armor", "backgrounds", "bestiary", "classes", "feats",
  "infusions", "invocations", "races", "weapons",
  "2024/armor", "2024/backgrounds", "2024/bastions", "2024/bestiary", "2024/classes",
  "2024/feats", "2024/invocations", "2024/races", "2024/weapons",
];

/// Ці чотири лишаються динамічними свідомо: вони несуть режим вбудовування з листа персонажа
/// (`?origin=character&persId=…&knownTarget=…`), тобто запит впливає не на фільтр, а на весь
/// вигляд сторінки. Перевести їх — окрема робота з власним ризиком, записана в KR22.4.
const DYNAMIC_BY_DESIGN = ["spells", "magic-items", "2024/spells", "2024/magic-items"];

const DYNAMIC_MARKERS = [/\bawait searchParams\b/, /\bsearchParams:\s*Promise</, /\bauth\(\)/];

function readListPage(route: string): string {
  return readFileSync(join(APP, route, "page.tsx"), "utf-8");
}

function findDynamicMarkers(route: string): string[] {
  const source = readListPage(route);
  return DYNAMIC_MARKERS.filter((marker) => marker.test(source)).map(String);
}

describe("списки каталогів статичні", () => {
  it("перелік списків не всох", () => {
    expect(STATIC_LISTS.length).toBe(18);
  });

  it("жоден статичний список не чекає на searchParams і не кличе auth()", () => {
    const dynamic = STATIC_LISTS.filter((route) => findDynamicMarkers(route).length > 0);

    expect(dynamic).toEqual([]);
  });

  it("жоден статичний список не передає initialSearchParams у клієнт", () => {
    const passing = STATIC_LISTS.filter((route) => readListPage(route).includes("initialSearchParams"));

    expect(passing).toEqual([]);
  });

  it("свідомо динамічні сторінки лишаються в переліку винятків, а не тихо стають статичними", () => {
    const quietlyStatic = DYNAMIC_BY_DESIGN.filter((route) => findDynamicMarkers(route).length === 0);

    expect(quietlyStatic).toEqual([]);
  });
});
