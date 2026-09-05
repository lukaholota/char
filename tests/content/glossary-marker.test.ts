import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import creatures2014 from "../../src/lib/generated/creatures.json";
import dictionary from "../../src/lib/refs/dictionary.json";
import rules2014 from "../../src/lib/generated/rules-2014.json";
import rules2024 from "../../src/lib/generated/rules-2024.json";
import {
  expandGlossaryMarkersToHtml,
  findGlossaryMarkers,
  stripGlossaryMarkers,
} from "../../src/lib/refs/glossary-marker";

/// Р20 — маркер оригіналу «термін{{English}}». Ці перевірки стережуть саме те, чим маркер
/// корисний: український текст лишається читабельним без нього, а англійський оригінал не
/// губиться й не витікає на сторінку сирими дужками.
describe("Р20 — маркер оригіналу в перекладеній прозі", () => {
  it("лишає український термін текстом, а оригінал забирає", () => {
    expect(stripGlossaryMarkers("завдає 30 променевої{{radiant}} шкоди")).toBe(
      "завдає 30 променевої шкоди"
    );
  });

  it("віддає пару «термін — оригінал» для кожного маркера", () => {
    expect(findGlossaryMarkers("Виклик Баала{{Bhaal}} завдає променевої{{radiant}} шкоди")).toEqual([
      { term: "Баала", original: "Bhaal" },
      { term: "променевої", original: "radiant" },
    ]);
  });

  it("розгортає маркер у підказку навколо слова перед ним", () => {
    expect(expandGlossaryMarkersToHtml("Виклик Баала{{Bhaal}}")).toBe(
      'Виклик <abbr title="Bhaal">Баала</abbr>'
    );
  });

  /// Оригінал із двох слів має підкреслити два, а не останнє: інакше «Аксіоматичний розум»
  /// показував би підказку лише на «розум», і читач вирішив би, що звірено саме одне слово.
  it("покриває стільки слів, скільки їх в оригіналі", () => {
    expect(expandGlossaryMarkersToHtml("Аксіоматичний розум{{Axiomatic Mind}}")).toBe(
      '<abbr title="Axiomatic Mind">Аксіоматичний розум</abbr>'
    );
  });

  it("не виходить за пунктуацію, коли слів в оригіналі більше", () => {
    expect(expandGlossaryMarkersToHtml("(потребує священного згортка{{Sacred Bundle}})")).toBe(
      '(потребує <abbr title="Sacred Bundle">священного згортка</abbr>)'
    );
  });

  /// Найдешевша помилка багатослівного маркера — зʼїсти число перед терміном і зробити
  /// «30 променевої» одним підкресленим шматком.
  it("не захоплює числа перед терміном", () => {
    expect(expandGlossaryMarkersToHtml("завдає 30 променевої{{radiant damage}} шкоди")).toBe(
      'завдає 30 <abbr title="radiant damage">променевої</abbr> шкоди'
    );
  });

  it("показує сам оригінал, коли слова перед маркером немає", () => {
    expect(expandGlossaryMarkersToHtml("Слово {{Bhaal}}")).toBe(
      'Слово <abbr title="Bhaal">Bhaal</abbr>'
    );
  });

  it("екранує лапки в оригіналі, щоб маркер не ламав атрибут", () => {
    expect(expandGlossaryMarkersToHtml('меч{{"sword"}}')).toBe(
      '<abbr title="&quot;sword&quot;">меч</abbr>'
    );
  });

  it("не чіпає текст без маркерів", () => {
    const plain = "<p><b>Укус.</b> Кидок ближньої атаки зброєю: +5, досяжність 5 фт.</p>";
    expect(expandGlossaryMarkersToHtml(plain)).toBe(plain);
    expect(stripGlossaryMarkers(plain)).toBe(plain);
  });

  /// Маркер часто ставлять на жирному лемі — «***Кров асасина{{Assassin's Blood}}***». Поки
  /// зірочки не були межею слова, вони заїжджали всередину <abbr>, і читач бачив саме зірочки
  /// замість жирного тексту. Знайдено в KR20.8 на статтях спорядження, але корінь спільний —
  /// тому й перевірка тут, а не в гейті партії.
  it("лишає розмітку зовні, коли маркер стоїть на жирному лемі", () => {
    expect(expandGlossaryMarkersToHtml("***Кров асасина{{Assassin's Blood}}***. Отрута.")).toBe(
      "***<abbr title=\"Assassin's Blood\">Кров асасина</abbr>***. Отрута."
    );
    expect(findGlossaryMarkers("**Приладдя алхіміка{{alchemist's supplies}} (50 зм)**")[0].term).toBe(
      "Приладдя алхіміка"
    );
  });

  /// Назва секції статблока в каталозі — `<p><b>Назва{{Original}}.</b> текст</p>`. Тег — така сама
  /// розмітка, як зірочки: без межі на `<`/`>` маркер затягував у <abbr> і `<p><b>`, і рендерер
  /// віддавав порожню підказку окремим абзацом, а сама назва лишалася без оригіналу.
  it("не виходить за HTML-тег, коли маркер стоїть на назві секції статблока", () => {
    expect(expandGlossaryMarkersToHtml("<p><b>Хауда{{Howdah}}.</b> Огр несе форт.</p>")).toBe(
      '<p><b><abbr title="Howdah">Хауда</abbr>.</b> Огр несе форт.</p>'
    );
    expect(
      expandGlossaryMarkersToHtml("<p><b>Легендарний опір{{Legendary Resistance}} (3/день).</b> Якщо.</p>")
    ).toBe('<p><b><abbr title="Legendary Resistance">Легендарний опір</abbr> (3/день).</b> Якщо.</p>');
    expect(findGlossaryMarkers("<p><b>Атака з піке{{Dive Attack}}.</b></p>")[0].term).toBe("Атака з піке");
  });

  /// Назва секції статблока — увесь жирний шматок, а не стільки слів, скільки в оригіналі:
  /// «Чутливість до сонячного світла{{Sunlight Sensitivity}}» підкреслювала лише «сонячного
  /// світла», і читач вирішував, що звірено половину назви. Власник 2026-09-04: «треба весь
  /// термін, який прямо має відповідник». Маркер тут ставив прохід KR30.2 на цілу назву, тож
  /// межа `<b>` і є межею терміна.
  it("на назві секції статблока покриває всю назву, скільки б слів не було в оригіналі", () => {
    expect(
      expandGlossaryMarkersToHtml("<p><b>Чутливість до сонячного світла{{Sunlight Sensitivity}}.</b> Кобольд.</p>")
    ).toBe('<p><b><abbr title="Sunlight Sensitivity">Чутливість до сонячного світла</abbr>.</b> Кобольд.</p>');
    expect(findGlossaryMarkers("<p><b>Виліт без атаки нагоди{{Flyby}}.</b></p>")[0].term).toBe(
      "Виліт без атаки нагоди"
    );
    expect(findGlossaryMarkers("<p><strong>Спис{{Spear}}.</strong></p>")[0].term).toBe("Спис");
  });

  it("на назві секції лишає дужку після маркера й число перед назвою зовні", () => {
    expect(
      findGlossaryMarkers("<p><b>Дихання кислотою{{Acid Breath}} (Перезарядка 5–6).</b></p>")[0].term
    ).toBe("Дихання кислотою");
    expect(findGlossaryMarkers("<p><b>5— Горщик з тлінними личинками{{5- Rot Grub Pot}}</b></p>")[0].term).toBe(
      "Горщик з тлінними личинками"
    );
  });

  it("пунктуацію всередині назви тримає, коли вона є і в оригіналі", () => {
    expect(
      findGlossaryMarkers("<p><b>Голова чорного дракона: Кислотний подих{{Black Dragon Head: Acid Breath}}.</b></p>")[0].term
    ).toBe("Голова чорного дракона: Кислотний подих");
    expect(findGlossaryMarkers("<p><b>Танцюй, моя ляльо!{{Dance, My Puppet!}}.</b></p>")[0].term).toBe(
      "Танцюй, моя ляльо!"
    );
    expect(findGlossaryMarkers("<p><b>Дії: Укус{{Bite}}.</b></p>")[0].term).toBe("Укус");
  });

  /// Markdown-жирне й комірка таблиці — не назва секції: «**Показ НІП{{NPC}}**» маркує лише
  /// «НІП», і весь шматок тут підкреслювати не можна. Так само жирний шматок, де маркер стоїть
  /// посередині, — це проза, і для неї далі працює лік слів оригіналу.
  it("поза HTML-жирним і посеред жирного шматка далі рахує слова оригіналу", () => {
    expect(findGlossaryMarkers("**Показ НІП{{NPC}}**")[0].term).toBe("НІП");
    expect(findGlossaryMarkers("| Крижана пустка{{Arctic}} | Шви |")[0].term).toBe("пустка");
    expect(findGlossaryMarkers("<b>Кожна істота{{creature}} в межах 10 футів</b>")[0].term).toBe("істота");
  });

  it("не захоплює межу комірки таблиці", () => {
    expect(findGlossaryMarkers("| Даґда{{The Daghdha}} | бог |")[0].term).toBe("Даґда");
  });

  /// Парна форма «{{Пасивний аналіз поведінки|Passive Insight}}» — рішення власника
  /// 2026-09-04 для прози, де українських слів більше, ніж в оригіналі, і лік слів не дістає
  /// до початку терміна. Український термін стоїть усередині дужок, тож для читача без
  /// рендерера (SEO, друк) він мусить лишатися текстом, а оригінал — забиратися.
  it("парна форма: термін лишається текстом, оригінал іде в підказку", () => {
    const text = "ви можете занотувати {{Пасивний аналіз поведінки|Passive Insight}} кожного персонажа";
    expect(stripGlossaryMarkers(text)).toBe("ви можете занотувати Пасивний аналіз поведінки кожного персонажа");
    expect(findGlossaryMarkers(text)).toEqual([{ term: "Пасивний аналіз поведінки", original: "Passive Insight" }]);
    expect(expandGlossaryMarkersToHtml(text)).toBe(
      'ви можете занотувати <abbr title="Passive Insight">Пасивний аналіз поведінки</abbr> кожного персонажа'
    );
  });

  it("парна форма: працює в жирному й терпить пробіли біля риски", () => {
    expect(expandGlossaryMarkersToHtml("**{{Підйомні ґрати|Portcullis}}**")).toBe(
      '**<abbr title="Portcullis">Підйомні ґрати</abbr>**'
    );
    expect(findGlossaryMarkers("{{ Бої на арені | Pit Fighting }}")).toEqual([
      { term: "Бої на арені", original: "Pit Fighting" },
    ]);
  });

  /// Гейт: там, де словник знає українську форму, довшу за підкреслене, маркер мусить бути
  /// парним. Інакше читач бачить половину терміна як звірену — те, з чого почалася правка
  /// «Чутливість до сонячного світла{{Sunlight Sensitivity}}» (власник, 2026-09-04).
  it("вимагає парної форми там, де словникова форма довша за підкреслене", () => {
    const forms = collectDictionaryForms();
    const short: string[] = [];

    for (const [file, text] of readGeneratedTexts()) {
      const markers = findGlossaryMarkers(text);
      let at = 0;
      for (const match of text.matchAll(/\{\{([^{}]+)\}\}/g)) {
        const { term, original } = markers[at];
        at += 1;
        if (match[1].includes("|")) continue;
        const before = text.slice(0, match.index).trimEnd().toLowerCase();
        for (const form of forms.get(normalizeTerm(original)) ?? []) {
          if (countWords(form) > countWords(term) && before.endsWith(form.toLowerCase())) {
            short.push(`${file}: «${form}{{${original}}}» підкреслює лише «${term}» — потрібно {{${form}|${original}}}`);
          }
        }
      }
    }

    expect(short).toEqual([]);
  });

  /// Заголовок статті й підрозділу малюється звичайним текстом, а оригінал у картці правил уже
  /// стоїть окремим полем `engTitle`. Маркер там і зайвий, і показує читачеві сирі дужки —
  /// знайдено в KR20.8 на сторінці `/2024/rules/equipment`, де їх було 22 на одному екрані.
  it("не лишає маркера в заголовках довідника — там оригінал уже показує engTitle", () => {
    const withMarker: string[] = [];
    for (const corpus of [rules2014, rules2024] as Array<
      Array<{ id: string; title: string; subsections: Array<{ id: string; title: string }> }>
    >) {
      for (const article of corpus) {
        if (article.title.includes("{{")) withMarker.push(article.id);
        for (const subsection of article.subsections) {
          if (subsection.title.includes("{{")) withMarker.push(subsection.id);
        }
      }
    }
    expect(withMarker).toEqual([]);
  });

  /// Сторож проти найдешевшої помилки: маркер, який доїхав до каталогу незакритим, покаже
  /// користувачеві сирі дужки. Рендерер такий залишок не розгорне.
  it("не лишає в каталозі 2014 жодних незакритих дужок", () => {
    const broken = (creatures2014 as Array<Record<string, unknown>>)
      .filter((creature) => /\{\{[^}]*$|^[^{]*\}\}/m.test(JSON.stringify(creature)))
      .map((creature) => creature.nameEng);

    expect(broken).toEqual([]);
  });
});

/// Кожен рядок кожного генерованого каталогу — окремим текстом, щоб «текст перед маркером»
/// лишався коротким, а не був усім файлом.
function* readGeneratedTexts(): Generator<[string, string]> {
  const directory = join(__dirname, "../../src/lib/generated");
  for (const file of readdirSync(directory).filter((name) => name.endsWith(".json"))) {
    const parsed = JSON.parse(readFileSync(join(directory, file), "utf8")) as unknown;
    for (const text of collectStrings(parsed)) {
      if (text.includes("{{")) yield [file, text];
    }
  }
}

function* collectStrings(value: unknown): Generator<string> {
  if (typeof value === "string") yield value;
  else if (Array.isArray(value)) for (const item of value) yield* collectStrings(item);
  else if (value && typeof value === "object") for (const item of Object.values(value)) yield* collectStrings(item);
}

/// Англійський ключ словника → українські форми, з обох словників: понять і контенту.
function collectDictionaryForms(): Map<string, string[]> {
  const forms = new Map<string, string[]>();
  const { DND_DICTIONARY, CONTENT_TRANSLATIONS } = dictionary as { DND_DICTIONARY: unknown; CONTENT_TRANSLATIONS: unknown };
  for (const [key, form] of [...collectLeafPairs(DND_DICTIONARY), ...collectLeafPairs(CONTENT_TRANSLATIONS)]) {
    const normalized = normalizeTerm(key);
    forms.set(normalized, [...(forms.get(normalized) ?? []), form]);
  }
  return forms;
}

function* collectLeafPairs(value: unknown): Generator<[string, string]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const [key, leaf] of Object.entries(value as Record<string, unknown>)) {
    if (typeof leaf === "string") yield [key, leaf];
    else yield* collectLeafPairs(leaf);
  }
}

/// «Passive Insight», «passiveInsight» і «passive-insight» — один ключ (як у `term-card.ts`).
function normalizeTerm(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function countWords(value: string): number {
  return value.trim() === "" ? 0 : value.trim().split(/\s+/).length;
}
