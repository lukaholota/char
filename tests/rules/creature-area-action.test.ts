import { describe, expect, it } from "vitest";
import creatures2014 from "@/lib/generated/creatures.json";
import creatures2024 from "@/lib/generated/creatures2024.json";
import { findCreatureAreaAction, findCreatureSaveAction, findCreatureSaveEffect, findCreatureSaveSpots, type CreatureAreaAction } from "@/rules/creature-area-action";

type CatalogCreature = { nameEng: string; actions?: unknown; legendaryActions?: unknown; lairActions?: unknown };

const cone60 = { shape: "cone", sizeFeet: 60, ability: "DEX", dc: 21, damage: { count: 18, sides: 6, bonus: 0 }, damageType: "fire", isHalfOnSave: true } as const;

describe("площа з рятівним кидком у статблоці", () => {
  it("2014: конус, провал і половина при успіху в окремих реченнях", () => {
    expect(
      findCreatureAreaAction(
        "Вогняний подих{{Fire Breath}} (перезарядка 5–6). Дракон видихає вогонь конусом 60 футів. Кожна істота в цій області повинна пройти рятівний кидок Спритності СК 21. Провал: 63 (18к6) вогняних ушкоджень. Успіх: лише половина ушкодження.",
      ),
    ).toEqual(cone60);
  });

  it("2014: лінія, шкода й половина в одному реченні, ширина не береться", () => {
    expect(
      findCreatureAreaAction(
        "Блискавичний подих. Дракон видихає блискавку лінією 40 футів завдовжки та 5 футів завширшки. Кожна істота на цій лінії має пройти рятівний кидок Спритності СК 12, отримуючи 16 (3к10) блискавичних ушкоджень при провалі або вдвічі менше при успіху.",
      ),
    ).toEqual({ shape: "line", sizeFeet: 40, ability: "DEX", dc: 12, damage: { count: 3, sides: 10, bonus: 0 }, damageType: "lightning", isHalfOnSave: true });
  });

  it("2014: «15-футовий конус», «ряткидок», «шкоди» й «половину цієї шкоди»", () => {
    expect(
      findCreatureAreaAction(
        "Вогняний подих{{Fire Breath}} (перезарядка 6). Мефіт видихає 15-футовий конус вогню. Кожна істота в цій області повинна пройти ряткидок Спритності зі СК 11, отримуючи 7 (2к6) вогняної шкоди при провалі, або половину цього ушкодження при успіху.",
      ),
    ).toEqual({ shape: "cone", sizeFeet: 15, ability: "DEX", dc: 11, damage: { count: 2, sides: 6, bonus: 0 }, damageType: "fire", isHalfOnSave: true });
  });

  it("2014: «у 15-футовому конусі», «у кубі», «радіусом»", () => {
    const base = (area: string) => `Кожна істота ${area} повинна пройти рятівний кидок Статури СК 13, отримуючи 24 (7к6) отруйних ушкоджень при провалі або вдвічі менше при успіху.`;
    expect(findCreatureAreaAction(base("у 15-футовому конусі"))).toMatchObject({ shape: "cone", sizeFeet: 15 });
    expect(findCreatureAreaAction(base("в кубі 30 футів"))).toMatchObject({ shape: "square", sizeFeet: 30 });
    expect(findCreatureAreaAction(base("у радіусі 20 футів"))).toMatchObject({ shape: "circle", sizeFeet: 20 });
    expect(findCreatureAreaAction(base("у сфері радіусом 10 футів"))).toMatchObject({ shape: "circle", sizeFeet: 10 });
    expect(findCreatureAreaAction(base("у циліндрі 10 фт."))).toMatchObject({ shape: "circle", sizeFeet: 10 });
  });

  it("2014: шкода «у дужках» з українським «К» і мінусом", () => {
    expect(
      findCreatureAreaAction("Вибух. Кожна істота у сфері радіусом 20 футів має пройти рятівний кидок Мудрості СК 15. При провалі істота дістає 9 (2К6 − 1) психічної шкоди."),
    ).toEqual({ shape: "circle", sizeFeet: 20, ability: "WIS", dc: 15, damage: { count: 2, sides: 6, bonus: -1 }, damageType: "psychic", isHalfOnSave: false });
  });

  it("2024: Конус, Провал й Успіх у форматі «СК N: кожна істота»", () => {
    expect(
      findCreatureAreaAction("Рятівний кидок Статури: СК 19, кожна істота в Конусі 60 футів. Провал: 54 (12к8) холодних ушкоджень. Успіх: половина ушкоджень."),
    ).toEqual({ shape: "cone", sizeFeet: 60, ability: "CON", dc: 19, damage: { count: 12, sides: 8, bonus: 0 }, damageType: "cold", isHalfOnSave: true });
  });

  it("2024: Сфера радіусом з центром у точці, без половини при успіху", () => {
    expect(
      findCreatureAreaAction(
        "Рятівний кидок Статури: СК 14, кожна істота у Сфері радіусом 30 футів із центром у точці, яку дракон бачить у межах 120 футів. Провал: 7 (2к6) холодних ушкоджень, і Швидкість цілі стає 0 до кінця наступного ходу цілі.",
      ),
    ).toEqual({ shape: "circle", sizeFeet: 30, ability: "CON", dc: 14, damage: { count: 2, sides: 6, bonus: 0 }, damageType: "cold", isHalfOnSave: false });
  });

  it("2024: Випромінювання", () => {
    expect(
      findCreatureAreaAction("Рятівний кидок Мудрості: СК 15, кожна істота у Випромінюванні 15 футів, що походить від нальфешні. Провал: 28 (8к6) психічних ушкоджень, і ціль стає Наляканою."),
    ).toEqual({ shape: "circle", sizeFeet: 15, ability: "WIS", dc: 15, damage: { count: 8, sides: 6, bonus: 0 }, damageType: "psychic", isHalfOnSave: false, condition: "frightened" });
  });

  it("2024: Лінія завдовжки й завширшки, «фт.» і шкода з бонусом", () => {
    expect(
      findCreatureAreaAction("Рятівний кидок Сили: СК 13, кожна істота в Лінії 30 фт. завдовжки і 5 фт. завширшки. Провал: 14 (4к6 + 2) дроблячих ушкоджень. Успіх: Половина ушкодження."),
    ).toEqual({ shape: "line", sizeFeet: 30, ability: "STR", dc: 13, damage: { count: 4, sides: 6, bonus: 2 }, damageType: "bludgeoning", isHalfOnSave: true });
  });

  it("2024: тип шкоди після слова «ушкоджень» і половина «в разі успіху»", () => {
    expect(
      findCreatureAreaAction("Конус 30 фт. Кожна істота має пройти рятівний кидок Інтелекту СК 17 або отримати 56 (16к6) ушкоджень вогнем (половину в разі успіху)."),
    ).toEqual({ shape: "cone", sizeFeet: 30, ability: "INT", dc: 17, damage: { count: 16, sides: 6, bonus: 0 }, damageType: "fire", isHalfOnSave: true });
  });

  it("2014: шкода, що діє «на початку ходу», — не шкода від провалу", () => {
    expect(
      findCreatureAreaAction("Кожна істота в конусі 30 футів має пройти рятівний кидок Статури СК 14, інакше отримує стан Отруєний. Вона отримує 5 (1к10) отруйних ушкоджень на початку кожного свого ходу."),
    ).toBeNull();
  });

  it("Харизма й ігнорування англійського маркера в назві", () => {
    expect(
      findCreatureAreaAction("Крик{{Scream}}. Кожна істота в конусі 10 футів має пройти рятівний кидок Харизми СК 12, отримуючи 3 (1к6) громових ушкоджень при провалі."),
    ).toMatchObject({ ability: "CHA", damageType: "thunder" });
  });
});

describe("площа з рятівним кидком: не розпізнається", () => {
  const save = "Кожна істота в конусі 30 футів має пройти рятівний кидок Спритності СК 15";

  it("атака ближнього бою", () => {
    expect(findCreatureAreaAction("Кидок ближньої атаки: +14, досяжність 10 футів, одна ціль. Влучання: 19 (2к10 + 8) колючих ушкоджень.")).toBeNull();
  });

  it("кидок без площі", () => {
    expect(findCreatureAreaAction("Одна істота в межах 30 футів має пройти рятівний кидок Спритності СК 15. Провал: 10 (3к6) вогняних ушкоджень.")).toBeNull();
  });

  it("площа без шкоди", () => {
    expect(findCreatureAreaAction(`${save}, інакше падає непритомною на 10 хвилин.`)).toBeNull();
  });

  it("площа без кидка й без СК", () => {
    expect(findCreatureAreaAction("Дракон видихає вогонь конусом 60 футів, завдаючи 63 (18к6) вогняних ушкоджень.")).toBeNull();
    expect(findCreatureAreaAction("Конус 30 фт. Кожна істота має пройти рятівний кидок Спритності проти вашої СК або отримати 2к6 стихійних ушкоджень.")).toBeNull();
  });

  it("кидок невідомої характеристики", () => {
    expect(findCreatureAreaAction("Кожна істота в конусі 30 футів має пройти рятівний кидок Удачі СК 15. Провал: 10 (3к6) вогняних ушкоджень.")).toBeNull();
  });

  it("дві різні характеристики кидка", () => {
    expect(findCreatureAreaAction(`${save}. Провал: ціль повторює рятівний кидок Мудрості СК 15 і отримує 10 (3к6) вогняних ушкоджень.`)).toBeNull();
  });

  it("два різні розміри площі", () => {
    expect(findCreatureAreaAction("Кожна істота в конусі 30 футів або в кубі 10 футів має пройти рятівний кидок Спритності СК 15. Провал: 10 (3к6) вогняних ушкоджень.")).toBeNull();
  });

  it("дві різні СК", () => {
    expect(findCreatureAreaAction("Кожна істота в конусі 30 футів має пройти рятівний кидок Спритності СК 15 або СК 17. Провал: 10 (3к6) вогняних ушкоджень.")).toBeNull();
  });

  it("кілька кубиків шкоди або кілька типів", () => {
    expect(findCreatureAreaAction(`${save}. Провал: 18 (4к8) вогняних ушкоджень і 18 (4к8) громових ушкоджень.`)).toBeNull();
    expect(findCreatureAreaAction(`${save}. Провал: 18 (4к8) вогняних і громових ушкоджень.`)).toBeNull();
  });

  it("кубики без типу шкоди", () => {
    expect(findCreatureAreaAction(`${save}. Провал: ціль віднімає 3 (1к6) від кидків ушкодження.`)).toBeNull();
    expect(findCreatureAreaAction(`${save}. Провал: 10 (3к6).`)).toBeNull();
  });

  it("площа тільки після кубиків шкоди", () => {
    expect(findCreatureAreaAction("Рятівний кидок Спритності: СК 14. Провал: 27 (5к10) силових ушкоджень. Якщо ціль — предмет, він розпадається в куб 10 футів пилу.")).toBeNull();
  });
});

describe("ряткидок однієї цілі", () => {
  it("без слів про область — ряткидок обраної цілі з половиною при успіху", () => {
    expect(
      findCreatureSaveAction("Одна видима істота в межах 30 фт. робить ряткидок Мудрості СК 11. При провалі вона отримує 7 (2к6) психічних ушкоджень. При успіху отримує половину ушкоджень без інших наслідків."),
    ).toEqual({ ability: "WIS", dc: 11, damage: { count: 2, sides: 6, bonus: 0 }, damageType: "psychic", isHalfOnSave: true });
  });

  it("хоумбрю пише «СЛ» чи «DC» і латинські кубики", () => {
    expect(findCreatureSaveAction("Ціль робить ряткидок Спритності СЛ 12. Провал: 10 (3d6) вогняних ушкоджень.")).toMatchObject({ ability: "DEX", dc: 12, damage: { count: 3, sides: 6 } });
    expect(findCreatureSaveAction("Ціль робить ряткидок Статури DC 13. Провал: 5 (2к4) отруйних ушкоджень.")).toMatchObject({ ability: "CON", dc: 13 });
  });

  it("область з ряткидком несе свою форму", () => {
    expect(findCreatureSaveAction("Кожна істота в 15-футовому конусі здійснює ряткидок Статури СК 13. При провалі вона зазнає 10 (3к6) некротичної шкоди. При успіху вона зазнає половини шкоди.")).toMatchObject({ area: { shape: "cone", sizeFeet: 15 }, isHalfOnSave: true });
  });

  it("«кожна істота в межах N футів» — коло навколо мовця, а «обирає істоту в межах» лишається однією ціллю", () => {
    expect(findCreatureSaveAction("Рятівний кидок Мудрості: СК 15, кожна істота в межах 100 футів від диявола, яка його чує. Провал: 18 (3к10) психічних ушкоджень. Успіх: лише половина ушкоджень.")).toMatchObject({ area: { shape: "circle", sizeFeet: 100 }, isHalfOnSave: true });
    expect(findCreatureSaveAction("Лицар обирає одну істоту, яку бачить у межах 15 футів. Ціль здійснює рятівний кидок Спритності СК 12. При провалі вона зазнає 5 (2к4) дроблячих ушкоджень.")).not.toHaveProperty("area");
  });

  it("дві різні області чи ряткидок після шкоди — нерозпізнано", () => {
    expect(findCreatureSaveAction("Кожна істота в конусі 30 футів або в кубі 10 футів має пройти рятівний кидок Спритності СК 15. Провал: 10 (3к6) вогняних ушкоджень.")).toBeNull();
    expect(findCreatureSaveAction("Кидок ближньої атаки: +5. Влучання: 6 (1к8 + 2) колючих ушкоджень, і ціль має пройти ряткидок Сили СК 12, інакше падає навзнак.")).toBeNull();
  });
});

describe("ряткидок без шкоди від провалу: стан цілі", () => {
  it("Бджехолдер: кожен промінь — свій ряткидок і свій стан", () => {
    expect(findCreatureSaveEffect("Медовий струмінь. Ціль повинна пройти рятівний кидок Спритності СК 17, інакше отримує стан Скований до кінця свого наступного ходу.")).toEqual({ ability: "DEX", dc: 17, condition: "restrained" });
    expect(findCreatureSaveEffect("Бджоламутнення. Ціль повинна пройти рятівний кидок Мудрості СК 17, інакше в неї так гуде у вухах, що вона отримує стан Недієздатний до кінця свого наступного ходу.")).toMatchObject({ ability: "WIS", condition: "incapacitated" });
    expect(findCreatureSaveEffect("Бджоляк. Ціль повинна пройти рятівний кидок Мудрості СК 17, інакше отримує стан Наляканий від бджехолдера на 1 хвилину. Вона може повторювати рятівний кидок наприкінці кожного свого ходу, знімаючи ефект із себе за успіху.")).toEqual({ ability: "WIS", dc: 17, condition: "frightened" });
    expect(findCreatureSaveEffect("Солодка згуба. Ціль повинна пройти рятівний кидок Харизми СК 17, інакше отримує стан Причарований від бджехолдера на 1 хвилину.")).toMatchObject({ ability: "CHA", condition: "charmed" });
  });

  it("шкода до ряткидка — окремий кидок, ряткидок лишається з ефектом", () => {
    const stinger = "Жало. Кидок ближньої атаки зброєю: +8, досяжність 10 фт., одна ціль. Влучання: 13 (2к8 + 4) колючих ушкоджень плюс 10 (3к6) отруйних ушкоджень, і ціль повинна пройти рятівний кидок Статури СК 17, інакше отримує стан Отруєний на 1 хвилину.";
    expect(findCreatureSaveEffect(stinger)).toEqual({ ability: "CON", dc: 17, condition: "poisoned" });
    expect(findCreatureSaveEffect("Промінь-банка. Ціль отримує 14 (4к6) ушкоджень силовим полем і повинна пройти рятівний кидок Сили СК 17, інакше її відкидає на 20 футів від бджехолдера й вона отримує стан Повалений.")).toEqual({ ability: "STR", dc: 17, condition: "prone" });
    expect(findCreatureSaveEffect("Хвіст. Влучання: 10 (1к12 + 4) дроблячої шкоди. Якщо ціль є істотою, вона мусить успішно пройти ряткидок Сили СК 15 або бути збитою з ніг.")).toMatchObject({ condition: "prone" });
  });

  it("2024: стан у реченні «Провал:» після СК, область перед ним", () => {
    expect(findCreatureSaveEffect("Смердюча хмара (1/день). Рятівний кидок Статури: СК 11, кожна істота у Випромінюванні 10 фт. від дретча. Провал: ціль отримує стан Отруєний до кінця свого наступного ходу.")).toEqual({ ability: "CON", dc: 11, condition: "poisoned" });
    expect(findCreatureSaveEffect("Паралітичний подих. Дракон видихає газ конусом 15 футів. Кожна істота в цій області повинна пройти рятівний кидок Статури СК 13, інакше отримує стан Паралізований на 1 хвилину.")).toEqual({ ability: "CON", dc: 13, condition: "paralyzed", area: { shape: "cone", sizeFeet: 15 } });
  });

  it("стан неочевидний — ряткидок без стану", () => {
    expect(findCreatureSaveEffect("Відштовхувальний подих. Кожна істота в конусі 30 футів повинна пройти рятівний кидок Сили СК 19. За провалу істоту відштовхує на 60 футів.")).toMatchObject({ condition: null });
    expect(findCreatureSaveEffect("Виття. Кожна істота в межах 30 футів має пройти рятівний кидок Статури СК 15, інакше падає до 0 хітів. За успіху істота отримує стан Наляканий до кінця свого наступного ходу.")).toMatchObject({ condition: null });
    expect(findCreatureSaveEffect("Подих. Ціль має пройти ряткидок Статури СК 13, інакше стає отруєною й паралізованою.")).toMatchObject({ condition: null });
    expect(findCreatureSaveEffect("Зникнення. Ціль мусить пройти ряткидок Мудрості СК 16, інакше балханнот стає Невидимим для цієї істоти.")).toMatchObject({ condition: null });
    expect(findCreatureSaveEffect("Відмашка. Ціль мусить зробити ряткидок Сили СК 24, інакше її відкидає. Якщо ряткидок провалено на 5 чи більше, ціль також дістає стан Повалений.")).toMatchObject({ condition: null });
  });

  it("не ряткидок цілі: шкода після ряткидка, ряткидок самої істоти, СК з доданком, різні СК", () => {
    expect(findCreatureSaveEffect("Промінь Вельзевула. Ціль повинна пройти рятівний кидок Статури СК 17, інакше отримує 27 (6к8) некротичних ушкоджень, а за успіху — половину.")).toBeNull();
    expect(findCreatureSaveEffect("Крик. Ціль має пройти ряткидок Мудрості СК 12, інакше отримує 2к6 психічної і 1к6 громової шкоди.")).toBeNull();
    expect(findCreatureSaveEffect("Вигнання вогнем. Якщо барґест починає свій хід у полумʼї, він повинен пройти рятівний кидок Харизми СК 15, інакше вигнаний до Ґеєни.")).toBeNull();
    expect(findCreatureSaveEffect("Нежива витривалість. Якщо ушкодження зводять зомбі до 0 хітів, ціль має пройти рятівний кидок Статури зі СК 5 + отримані ушкодження.")).toBeNull();
    expect(findCreatureSaveEffect("Погляд. Ціль робить ряткидок Мудрості СК 12 або ряткидок Мудрості СК 14.")).toBeNull();
    expect(findCreatureSaveEffect("Погляд. Ціль робить ряткидок зі СК 12.")).toBeNull();
    expect(findCreatureSaveEffect("Подих. Кожна істота в конусі 30 футів або в кубі 10 футів має пройти рятівний кидок Спритності СК 15, інакше отримує стан Повалений.")).toBeNull();
  });

  it("ряткидок зі шкодою теж несе стан провалу, якщо він очевидний", () => {
    expect(findCreatureSaveAction("Удар крилами. Кожна істота в межах 10 футів повинна пройти рятівний кидок Спритності СК 19, інакше отримує 13 (2к6 + 6) дроблячих ушкоджень і отримує стан Повалений.")).toMatchObject({ dc: 19, condition: "prone" });
    expect(findCreatureSaveAction("Подих. Кожна істота в 15-футовому конусі здійснює ряткидок Спритності СК 13. При провалі вона зазнає 10 (3к6) вогняної шкоди.")).not.toHaveProperty("condition");
  });

  it("фраза ряткидка — місце для кнопки", () => {
    const text = "Ціль повинна пройти рятівний кидок Спритності СК 17, інакше отримує стан Скований.";
    const [spot] = findCreatureSaveSpots(text);
    expect(text.slice(spot.start, spot.end)).toBe("рятівний кидок Спритності СК 17");
    expect(spot.roll).toEqual({ kind: "save", ability: "DEX", dc: 17 });
  });
});

describe("площі в статблоках каталогу", () => {
  const allowedMisses: Record<string, string> = {
    "Brass Greatwyrm": "кілька подихів в одному абзаці",
    "Bronze Greatwyrm": "кілька подихів в одному абзаці",
    "Copper Greatwyrm": "кілька подихів в одному абзаці",
    "Gold Greatwyrm": "кілька подихів в одному абзаці",
    "Silver Greatwyrm": "кілька подихів в одному абзаці",
    "Dracohydra": "тип шкоди на вибір дракогідри",
    "Dragonbone Golem": "між «конус» і розміром стоїть інше слово",
    "Draconic Spirit": "СК заклинателя, а не число",
    "Gold Dragon Wyrmling": "кубики віднімаються від кидків, це не шкода",
    "Young Gold Dragon": "кубики віднімаються від кидків, це не шкода",
    "Adult Gold Dragon": "кубики віднімаються від кидків, це не шкода",
    "Ancient Gold Dragon": "кубики віднімаються від кидків, це не шкода",
  };

  const readParagraphs = (creature: CatalogCreature) =>
    [creature.actions, creature.legendaryActions, creature.lairActions]
      .filter((html): html is string => typeof html === "string")
      .flatMap((html) => html.split("</p>"))
      .map((paragraph) => paragraph.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

  const sweep = (catalog: unknown) => {
    const found: CreatureAreaAction[] = [];
    const misses: string[] = [];
    for (const creature of catalog as CatalogCreature[]) {
      for (const paragraph of readParagraphs(creature)) {
        const action = findCreatureAreaAction(paragraph);
        if (action) found.push(action);
        else if (/подих/i.test(paragraph) && /СК/.test(paragraph) && /\d[кК]\d/.test(paragraph) && !allowedMisses[creature.nameEng]) misses.push(creature.nameEng);
      }
    }
    return { found, misses };
  };

  it.each([
    ["2014", creatures2014, 100],
    ["2024", creatures2024, 60],
  ])("%s: кожен подих з СК і кубиками розпізнається, межі значень", (edition, catalog, minimumFound) => {
    const { found, misses } = sweep(catalog);
    console.info(`площ з рятівним кидком ${edition}: ${found.length}`);
    expect(misses).toEqual([]);
    expect(found.length).toBeGreaterThanOrEqual(minimumFound);
    for (const action of found) {
      expect(action.sizeFeet).toBeGreaterThanOrEqual(5);
      expect(action.sizeFeet).toBeLessThanOrEqual(500);
      expect(action.dc).toBeGreaterThanOrEqual(5);
      expect(action.dc).toBeLessThanOrEqual(30);
      expect([4, 6, 8, 10, 12, 20]).toContain(action.damage.sides);
      expect(action.damage.count).toBeGreaterThanOrEqual(1);
    }
  });

  it.each([
    ["2014", creatures2014, 300],
    ["2024", creatures2024, 60],
  ])("%s: ряткидки без шкоди здебільшого несуть стан, СК у межах", (_edition, catalog, minimumFound) => {
    const effects = (catalog as CatalogCreature[]).flatMap((creature) => readParagraphs(creature).map(findCreatureSaveEffect)).filter((effect) => effect !== null);
    expect(effects.length).toBeGreaterThanOrEqual(minimumFound);
    expect(effects.filter((effect) => effect.condition).length / effects.length).toBeGreaterThan(0.6);
    for (const effect of effects) {
      expect(effect.dc).toBeGreaterThanOrEqual(5);
      expect(effect.dc).toBeLessThanOrEqual(30);
    }
  });
});
