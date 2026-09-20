import { describe, expect, it } from "vitest";
import bg3Map from "../../data/spell-icons/bg3-map.json";
import noIcon from "../../data/spell-icons/no-bg3-icon.json";
import catalog2014 from "@/lib/generated/spells.json";
import catalog2024 from "../../data/2024/normalized/spells.json";

/// KR40.1: іконка заклинання адресується назвою файлу на bg3.wiki, а звірка назв — ручна.
/// Червоний тест означає, що каталог поповнився заклинанням, для якого ніхто не вирішив, є
/// в BG3 його іконка чи ні, — або що в реєстрі одрук у ключі.

const catalogNames = [
  ...catalog2014.map((spell) => spell.engName),
  ...catalog2024.map((spell) => spell.engName),
];
const uniqueNames = [...new Set(catalogNames)].sort();
const mapped = Object.keys(bg3Map).sort();
const absent = Object.keys(noIcon).sort();

describe("реєстр іконок заклинань", () => {
  it("кожен ключ реєстру є назвою заклинання з каталогу", () => {
    expect([...mapped, ...absent].filter((name) => !uniqueNames.includes(name))).toEqual([]);
  });

  it("реєстр і список без іконки разом покривають кожну назву рівно раз", () => {
    expect([...mapped, ...absent].sort()).toEqual(uniqueNames);
    expect(mapped.filter((name) => absent.includes(name))).toEqual([]);
  });

  it("жоден файл вікі не вжито двічі", () => {
    const files = Object.values(bg3Map);
    const twice = files.filter((file, index) => files.indexOf(file) !== index);
    expect(twice).toEqual([]);
  });

  it("імена файлів записані без префікса File: і без хвоста Unfaded Icon.webp", () => {
    expect(Object.values(bg3Map).filter((file) => /^File:|Unfaded Icon|\.webp$/.test(file))).toEqual([]);
  });

  it("кожна причина в списку без іконки непорожня", () => {
    expect(Object.entries(noIcon).filter(([, reason]) => !reason.trim()).map(([name]) => name)).toEqual([]);
  });
});
