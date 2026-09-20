import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  findStaleExceptions,
  linkRuleTermCarrier,
  linkRuleTermsInText,
  readRuleTermExceptions,
  readTermForms,
  RULE_TERM_CARRIERS,
} from "../../scripts/rule-term-links/rule-term-mentions";
import { applyJsonStringEdits } from "../../scripts/spell-links/spell-mentions";
import { listRuleTermLinks } from "@/lib/term-link";
import ruleTermCards from "@/lib/generated/rule-term-cards.json";
import type { TermCard } from "@/lib/term-card";

/// KR34.3 — посилання на стан чи дію в описі ставить проставляч по переглянутому словнику форм.
/// Спершу поведінка на фікстурах (що звʼязується, а що ні), потім гейт на справжніх носіях: новий
/// опис без посилань на стани й дії не проходить.
const forms = readTermForms();
const link2014 = (text: string) => linkRuleTermsInText(text, "RULES_2014", forms).text;
const link2024 = (text: string) => linkRuleTermsInText(text, "RULES_2024", forms).text;

describe("KR34.3 — що проставляч звʼязує", () => {
  it("стан у відмінку загортається якорем своєї редакції, і лише перша згадка", () => {
    expect(link2014("Ціль стає паралізованою. Паралізована істота не рухається.")).toBe(
      'Ціль стає <a href="/rules/conditions#condition-paralyzed">паралізованою</a>. Паралізована істота не рухається.'
    );
    expect(link2024("отримує стан Повалений")).toBe(
      'отримує стан <a href="/2024/rules/conditions#condition-prone">Повалений</a>'
    );
  });

  it("перевагу звʼязує лише як механіку кубика, а не як «вигоди»", () => {
    expect(link2014("Ви маєте перевагу на ряткидки Сили.")).toContain("<a href=");
    expect(link2014("кидок робиться з перевагою.")).toContain("<a href=");
    expect(link2014("Бонусною дією ви здобуваєте такі переваги на 1 хвилину:")).not.toContain("condition");
    expect(link2014("Додайте кубик переваги до шкоди.")).not.toContain("advantage");
    expect(link2014("Створіння отримує одну перевагу на ваш вибір.")).not.toContain("advantage");
  });

  it("невидимим робить істоту, а не предмет", () => {
    expect(link2024("Ви отримуєте стан Невидимий.")).toContain("condition-invisible");
    expect(link2024("бачити невидимих створінь")).toContain("condition-invisible");
    expect(link2024("Ви створюєте Невидимий сенсор у межах відстані.")).not.toContain("condition-invisible");
    expect(link2024("і рука невидима, коли ви використовуєте це")).not.toContain("condition-invisible");
  });

  it("не чіпає чужий якір, маркер оригіналу, [EngName], жирну назву й назву перед [EngName]", () => {
    const untouched = [
      '<a href="/2024/spells/hold-person">паралізованим</a>',
      "Закривавлена{{Bloodied}} істота",
      "**Паралізований удар.** Текст.",
      "Промінь виснаження [Ray of Enfeeblement] на 5 рівні",
    ];
    for (const text of untouched) expect(link2024(text), text).toBe(text);
  });

  it("термін без статті в редакції носія не звʼязує", () => {
    expect(link2014("якщо ви Закривавлені")).toBe("якщо ви Закривавлені");
    expect(link2024("якщо ви Закривавлені")).toContain("condition-bloodied");
  });

  it("другий прогін нічого не міняє", () => {
    const once = link2014("Бонусною дією ви стаєте невидимим, а реакцією — схопленим. Цю реакцію можна повторити.");
    expect(link2014(once)).toBe(once);
  });

  it("у TS-літералі з подвійними лапками екранує атрибут", () => {
    const { text } = linkRuleTermsInText('"реакцією зменшити шкоду"', "RULES_2014", forms, { quote: '"' });
    expect(text).toBe('"<a href=\\"/rules/combat#reactions--reactions\\">реакцією</a> зменшити шкоду"');
  });
});

describe("KR34.3 — підстановка в JSON", () => {
  it("опис, що є підрядком довшого опису, не ламає запис файлу", () => {
    const short = "виконуєте дію Атака.";
    const long = "виконуєте дію Атака. Крім того, ще щось.";
    const source = JSON.stringify([{ description: long }, { description: short }], null, 2);
    const edits = [
      { original: short, linked: link2014(short) },
      { original: long, linked: link2014(long) },
    ];
    const expected = [{ description: link2014(long) }, { description: link2014(short) }];
    expect(applyJsonStringEdits(source, edits, expected)).not.toBeNull();
  });

  it("короткий опис, дослівно рівний повному, лишається без якоря, а файл записується", () => {
    const root = mkdtempSync(join(tmpdir(), "rule-term-carrier-"));
    const text = "Поки ви носите цей плащ, ви маєте перевагу на ряткидки проти заклинань.";
    writeFileSync(join(root, "items.json"), `${JSON.stringify([{ description: text, shortDescription: text }], null, 2)}\n`);

    const report = linkRuleTermCarrier({ path: "items.json", edition: "RULES_2014", format: "json" }, forms, {}, root, true);
    const [item] = JSON.parse(readFileSync(join(root, "items.json"), "utf-8"));

    expect(report.unwritable).toBeUndefined();
    expect(item.description).toBe(link2014(text));
    expect(item.shortDescription).toBe(text);
  });
});

describe("KR34.3 — TS-носій: термін шукається в тексті, а не в коді", () => {
  const linkTypeScript = (source: string) => {
    const root = mkdtempSync(join(tmpdir(), "rule-term-ts-carrier-"));
    writeFileSync(join(root, "features.ts"), source);
    const report = linkRuleTermCarrier({ path: "features.ts", edition: "RULES_2014", format: "ts" }, forms, {}, root, true);
    return { report, written: readFileSync(join(root, "features.ts"), "utf-8") };
  };
  const bonusAction = '<a href="/rules/combat#order-of-combat--bonus-actions">';

  it("бачить термін одразу після \\n і після відкривальної одинарної лапки", () => {
    const { written } = linkTypeScript(
      "const a = { description: \"Запас кісток.\\n\\nБонусною дією ви зцілюєте.\" };\n" +
        "const b = { description: 'Бонусною дією ви завдаєте шкоди.' };\n"
    );
    expect(written).toContain(`\\n\\n${bonusAction.replace(/"/g, '\\"')}Бонусною дією</a> ви зцілюєте`);
    expect(written).toContain(`'${bonusAction}Бонусною дією</a> ви завдаєте`);
  });

  it("бачить опис, складений через +, і ставить одне посилання на весь опис", () => {
    const { written } = linkTypeScript(
      'const a = { description:\n  "Ви входите в лють бонусною дією.\\n" +\n  "Бонусною дією ви закінчуєте лють." };\n'
    );
    expect(written.match(/order-of-combat--bonus-actions/g)).toHaveLength(1);
    expect(written).toContain('лють <a href=\\"/rules/combat#order-of-combat--bonus-actions\\">бонусною дією</a>.');
  });

  it("бачить опис-масив із .join і опис у константі", () => {
    const { written } = linkTypeScript(
      'const a = { description: ["Перший абзац.", "Якщо у вас є перевага на кидок атаки."].join("\\n\\n") };\n' +
        'export const SHAPE_DESCRIPTION = "Ви повертаєтеся до форми бонусною дією.";\n' +
        "const b = { description: SHAPE_DESCRIPTION };\n"
    );
    expect(written).toContain("advantage-and-disadvantage");
    expect(written.match(/order-of-combat--bonus-actions/g)).toHaveLength(1);
  });

  it("другий прогін нічого не міняє", () => {
    const { written } = linkTypeScript("const a = { description: 'Текст.\\nБонусною дією — ' + `реакцією ${x}` };\n");
    expect(linkTypeScript(written).written).toBe(written);
  });
});

describe("KR34.7 — статблок: одне посилання на термін на всю істоту", () => {
  const writeStatblocks = (creatures: unknown[]) => {
    const root = mkdtempSync(join(tmpdir(), "rule-term-statblock-"));
    writeFileSync(join(root, "monsters.json"), `${JSON.stringify(creatures, null, 2)}\n`);
    return root;
  };
  const linkStatblocks = (root: string) =>
    linkRuleTermCarrier({ path: "monsters.json", edition: "RULES_2014", format: "json", kind: "statblock" }, forms, {}, root, true);
  const readStatblocks = (root: string) => JSON.parse(readFileSync(join(root, "monsters.json"), "utf-8"));

  const wolf = {
    slug: "wolf",
    name: "Вовк",
    description: "",
    traits: [
      { name: "Тактика зграї{{Pack Tactics}}", text: "Вовк має перевагу на кидок атаки по істоті, якщо поруч союзник." },
      { name: "Гострий нюх{{Keen Smell}}", text: "Вовк має перевагу на перевірки Мудрості (Уважність)." },
    ],
    actions: [{ name: "Укус{{Bite}}", text: "Влучання: ціль має скласти ряткидок Сили, інакше стає поваленою." }],
  };

  it("перша згадка терміна в статблоці — посилання, повтор у наступній здібності — текст", () => {
    const root = writeStatblocks([wolf]);
    linkStatblocks(root);
    const [linked] = readStatblocks(root);

    expect(linked.traits[0].text).toContain('<a href="/rules/abilities#advantage-and-disadvantage--advantage-and-disadvantage">перевагу</a>');
    expect(linked.traits[1].text).toBe(wolf.traits[1].text);
    expect(linked.actions[0].text).toContain("condition-prone");
  });

  it("назви здібностей і слаг не чіпає, а друга істота отримує свої посилання", () => {
    const root = writeStatblocks([wolf, { ...wolf, slug: "dire-wolf", name: "Лютововк" }]);
    linkStatblocks(root);
    const [, second] = readStatblocks(root);

    expect(second.traits[0].name).toBe("Тактика зграї{{Pack Tactics}}");
    expect(second.traits[0].text).toContain("advantage-and-disadvantage");
  });

  it("другий прогін нічого не міняє, навіть коли перше посилання стоїть у пізнішій секції", () => {
    const root = writeStatblocks([wolf]);
    linkStatblocks(root);
    const once = readFileSync(join(root, "monsters.json"), "utf-8");

    expect(linkStatblocks(root).wrapped).toEqual([]);
    expect(readFileSync(join(root, "monsters.json"), "utf-8")).toBe(once);
  });
});

describe("KR34.3 — гейт на носіях", () => {
  const exceptions = readRuleTermExceptions();
  /// Прогін по всіх носіях — секунди; обидва тести нижче читають той самий звіт.
  const reports = RULE_TERM_CARRIERS.map((carrier) => linkRuleTermCarrier(carrier, forms, exceptions));

  it("у жодному носії не лишилося незвʼязаної згадки — інакше `bunx tsx scripts/link-rule-term-mentions.ts --write`", () => {
    const unlinked = reports.flatMap((report) =>
      report.wrapped.map((mention) => `${report.path} — ${mention.original}: …${mention.context}…`)
    );
    expect(unlinked).toEqual([]);
  });

  it("кожен носій записується без переформатування", () => {
    const unwritable = reports
      .filter((report) => report.unwritable)
      .map((report) => `${report.path}: ${report.unwritable}`);
    expect(unwritable).toEqual([]);
  });

  it("кожен термін словника форм є в реєстрі посилань", () => {
    const registered = new Set(listRuleTermLinks().map((entry) => entry.original));
    expect(Object.keys(forms).filter((original) => !registered.has(original))).toEqual([]);
  });

  it("форми терміна виходять із його ратифікованої назви — стану, словника чи статті", () => {
    const cards = ruleTermCards as Record<string, Record<string, TermCard>>;
    const orphans = Object.entries(forms).filter(([original, rules]) => {
      const names = collectUkrainianNames([cards.RULES_2014[original], cards.RULES_2024[original]]);
      const allForms = rules.flatMap((rule) => rule.forms.map((form) => form.toLowerCase()));
      return !names.some((name) => allForms.some((form) => form.includes(name) || name.includes(form)));
    });
    expect(orphans.map(([original]) => original)).toEqual([]);
  });

  it("жоден виняток не протух", () => {
    expect(findStaleExceptions(exceptions)).toEqual([]);
  });
});

function collectUkrainianNames(cards: Array<TermCard | undefined>): string[] {
  return cards.flatMap((card) =>
    card
      ? [
          card.condition?.name,
          card.article?.title,
          card.article?.subsection?.title,
          ...card.dictionary.map((entry) => entry.term),
        ]
          .filter((name): name is string => Boolean(name))
          .map((name) => name.toLowerCase())
      : []
  );
}
