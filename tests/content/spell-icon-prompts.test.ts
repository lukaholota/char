import { describe, expect, it } from "vitest";
import subjects from "../../data/spell-icons/prompt-subjects.json";
import bg3Map from "../../data/spell-icons/bg3-map.json";
import noIcon from "../../data/spell-icons/no-bg3-icon.json";
import catalog2014 from "@/lib/generated/spells.json";
import catalog2024 from "../../data/2024/normalized/spells.json";
import { buildIconFileName, buildIconPrompt, findDefaultHue } from "@/lib/refs/icon-prompt";

/// KR40.3: сюжет пишеться руками для заклинання, у якого іконки немає. Червоний тест означає
/// або сюжет для того, кому іконка вже є, або одрук у ключі, або незаповнений шаблон.

const schoolByName = new Map<string, string | null>();
for (const spell of [...catalog2014, ...catalog2024]) {
  if (!schoolByName.has(spell.engName)) schoolByName.set(spell.engName, spell.school);
}

describe("реєстр сюжетів для генерації іконок", () => {
  it("сюжет написано лише для заклинань без іконки", () => {
    const withIcon = new Set(Object.keys(bg3Map));
    const needsIcon = new Set(Object.keys(noIcon));
    const stray = Object.keys(subjects).filter((name) => withIcon.has(name) || !needsIcon.has(name));
    expect(stray).toEqual([]);
  });

  it("імена файлів різних заклинань не збігаються", () => {
    const names = [...schoolByName.keys()].map(buildIconFileName);
    const twice = names.filter((name, index) => names.indexOf(name) !== index);
    expect(twice).toEqual([]);
  });

  it("два заклинання не мають однакового сюжету", () => {
    const written = Object.values(subjects).map((entry) => entry.subject.trim().toLowerCase());
    const twice = written.filter((subject, index) => written.indexOf(subject) !== index);
    expect(twice).toEqual([]);
  });

  it("зібраний промпт не лишає незаповнених місць і має відтінок", () => {
    for (const [engName, entry] of Object.entries(subjects)) {
      const hue = entry.hue ?? findDefaultHue(schoolByName.get(engName));
      const prompt = buildIconPrompt(hue, entry.subject);
      expect(hue.trim().length, engName).toBeGreaterThan(0);
      expect(entry.subject.trim().length, engName).toBeGreaterThan(0);
      expect(prompt, engName).not.toContain("{{");
    }
  });
});
