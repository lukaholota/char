import {
  PrismaClient,
  FeatureDisplayType,
  RestType,
  Prisma,
  Ruleset,
} from "@prisma/client";
import {
  normalizeFeatureCreateInput,
  type SeedFeatureCreateInput,
} from "./helpers/featureDisplayType";

const ACTIVE_RULESET: Ruleset = "RULES_2014";

export const seedSubraceFeatures = async (prisma: PrismaClient) => {
  console.log("🌟 Додаємо фічі підрас...");

  const features: SeedFeatureCreateInput[] = [
    // ============ ELF SUBRACE FEATURES ============

    // --- WOOD ELF ---
    {
      name: "Маскування в дикій природі",
      engName: "Mask of the Wild",
      description:
        "Ви можете спробувати сховатися, навіть коли ви лише трохи закриті листям, сильним дощем, снігопадом, туманом або іншим природним явищем.",
      shortDescription: "Можна ховатися в легкій природній місцевості",
      displayType: [FeatureDisplayType.PASSIVE],
    },
    {
      name: "Прудконогість",
      engName: "Fleet of Foot",
      description: "Ваша базова швидкість ходьби збільшується до 35 футів.",
      shortDescription: "Швидкість 35 футів",
      displayType: [FeatureDisplayType.PASSIVE],
    },

    // --- DROW ---
    {
      name: "Вищий темнозір (Дроу)",
      engName: "Superior Darkvision (Drow)",
      description: "Ваш темнозір має радіус 120 футів.",
      shortDescription: "Темнозір 120 футів",
      displayType: [FeatureDisplayType.PASSIVE],
    },
    {
      name: "Чутливість до сонячного світла",
      engName: "Sunlight Sensitivity",
      description:
        "Ви маєте <a href=\"/rules/abilities#advantage-and-disadvantage--advantage-and-disadvantage\">перешкоду</a> на кидки атаки та на перевірки  Уважність (Мудрість), які покладаються на зір, коли ви, ціль вашої атаки або те, що ви намагаєтеся сприйняти, знаходиться під прямим сонячним світлом.",
      shortDescription: "Перешкода на атаки/уважність на сонці",
      displayType: [FeatureDisplayType.PASSIVE],
    },
    {
      name: "Магія дроу",
      engName: "Drow Magic",
      description:
        'Ви знаєте заклинання <a href="/spell/1350">Мерехтливі вогники [Dancing Lights]</a>. Коли ви досягаєте 3-го рівня, ви можете один раз використати заклинання <a href="/spell/1041">Вогники фей [Faerie Fire]</a>. Коли ви досягаєте 5-го рівня, ви також можете один раз використати заклинання <a href="/spell/1249">Темрява [Darkness]</a>. Після використання кожного з цих заклять ви не можете використовувати це заклинання знову, доки не завершите довгий відпочинок. Харизма є вашою характеристикою для цих заклинань.',
      shortDescription:
        "<a href=\"/spells/dancing-lights\">Мерехтливі вогники [Dancing Lights]</a>, <a href=\"/spells/faerie-fire\">Вогники фей [Faerie Fire]</a>, <a href=\"/spells/darkness\">Темрява [Darkness]</a>",
      displayType: [FeatureDisplayType.PASSIVE],
      limitedUsesPer: RestType.LONG_REST,
      givesSpells: {
        connect: [
          { engName_ruleset: { engName: "Dancing Lights", ruleset: ACTIVE_RULESET } },
          { engName_ruleset: { engName: "Faerie Fire", ruleset: ACTIVE_RULESET } },
          { engName_ruleset: { engName: "Darkness", ruleset: ACTIVE_RULESET } },
        ],
      },
    },
    {
      name: "Дроуське бойове навчання",
      engName: "Drow Weapon Training",
      description:
        "Ви володієте рапірами, короткими мечами та ручними арбалетами.",
      shortDescription: "Володіння рапірами, кор. мечами, руч. арбалетами",
      displayType: [FeatureDisplayType.PASSIVE],
    },

    // --- ELADRIN (DMG) ---
    {
      name: "Фейський крок (DMG)",
      engName: "Fey Step (DMG)",
      description:
        'Ви можете використати заклинання <a href="/spell/1247">Туманний крок [Misty Step]</a> один раз, використовуючи цю рису. Ви відновлюєте можливість зробити це, коли завершуєте короткий або довгий відпочинок.',
      shortDescription: "<a href=\"/spells/misty-step\">Туманний крок [Misty Step]</a> раз на короткий відпочинок",
      displayType: [FeatureDisplayType.PASSIVE],
      limitedUsesPer: RestType.SHORT_REST,
      usesCount: 1,
      givesSpells: {
        connect: [{ engName_ruleset: { engName: "Misty Step", ruleset: ACTIVE_RULESET } }],
      },
    },

    // --- SEA ELF ---
    {
      name: "Дитя моря",
      engName: "Child of the Sea (Sea Elf Subrace)",
      description:
        "Ви маєте швидкість плавання 30 футів, і ви можете дихати повітрям і водою.",
      shortDescription: "Плавання 30 футів, амфібія",
      displayType: [FeatureDisplayType.PASSIVE],
    },
    {
      name: "Друг моря",
      engName: "Friend of the Sea (Sea Elf Subrace)",
      description:
        "Використовуючи жести та звуки, ви можете спілкуватися з будь-яким звіром, який має вроджену швидкість плавання.",
      shortDescription: "Спілкування з морськими звірами",
      displayType: [FeatureDisplayType.PASSIVE],
    },

    // --- SHADAR-KAI ---
    {
      name: "Опір некротичній енергії",
      engName: "Necrotic Resistance (Shadar-kai Subrace)",
      description: "Ви маєте <a href=\"/rules/combat?term=Resistance#making-an-attack--damage-and-healing--resistance-and-vulnerability\">опір</a> до некротичної шкоди.",
      shortDescription: "Опір до некротичної шкоди",
      displayType: [FeatureDisplayType.PASSIVE],
    },
    {
      name: "Благословення Королеви Воронів",
      engName: "Blessing of the Raven Queen (Shadar-kai Subrace)",
      description:
        "<a href=\"/rules/combat#order-of-combat--bonus-actions\">Бонусною дією</a> ви можете магічно телепортуватися на відстань до 30 футів у вільний простір, який ви бачите. Ви можете використовувати цю рису кількість разів, що дорівнює вашому бонусу майстерності, і відновлюєте всі витрачені використання, коли закінчуєте довгий відпочинок.\\n\\nПочинаючи з 3-го рівня, ви також отримуєте <a href=\"/rules/combat?term=Resistance#making-an-attack--damage-and-healing--resistance-and-vulnerability\">опір</a> до всіх видів шкоди, коли телепортуєтеся за допомогою цієї риси. Опір триває до початку вашого наступного ходу. Протягом цього часу ви виглядаєте примарним і напівпрозорим.",
      shortDescription:
        "Телепорт 30 футів + опір до всієї шкоди (з 3-го рівня)",
      displayType: [FeatureDisplayType.BONUSACTION],
      limitedUsesPer: RestType.LONG_REST,
      usesCountDependsOnProficiencyBonus: true,
    },

    // --- PALLID ELF ---
    {
      name: "Проникливе чуття",
      engName: "Incisive Sense",
      description:
        "Ви маєте <a href=\"/rules/abilities#advantage-and-disadvantage--advantage-and-disadvantage\">Перевагу</a> на перевірки Інтелекту (Розслідування) та Мудрості (Аналіз Поведінки).",
      shortDescription: "Перевага на Розслідування та Аналіз Поведінки.",
      displayType: [FeatureDisplayType.PASSIVE],
    },
    {
      name: "Благословення Ткалі Місяця",
      engName: "Blessing of the Moon Weaver",
      description:
        "Ви знаєте замовляння <a href=\"/spells/light\">Світло [Light]</a>. Починаючи з 3-го рівня, можете один раз накласти <a href=\"/spells/sleep\">Сон [Sleep]</a> за допомогою цієї риси й відновлюєте можливість після завершення тривалого відпочинку. Починаючи з 5-го рівня, так само можете один раз накласти <a href=\"/spells/invisibility\">Невидимість [Invisibility]</a>, але лише на себе, й відновлюєте можливість після завершення тривалого відпочинку. Накладання цих заклинань за допомогою риси не потребує матеріальних компонентів. Мудрість є вашою характеристикою чаротворення для цих заклинань.",
      shortDescription: "Світло; з 3-го рівня Сон, із 5-го Невидимість лише на себе. Мудрість, без матеріальних компонентів; кожне не-замовляння раз між тривалими відпочинками.",
      displayType: [FeatureDisplayType.PASSIVE],
      limitedUsesPer: RestType.LONG_REST,
      givesSpells: {
        connect: [
          { engName_ruleset: { engName: "Light", ruleset: ACTIVE_RULESET } },
          { engName_ruleset: { engName: "Sleep", ruleset: ACTIVE_RULESET } },
          { engName_ruleset: { engName: "Invisibility", ruleset: ACTIVE_RULESET } },
        ],
      },
    },

    // --- HIGH ELF EXTRA ---
    {
      name: "Замовляння вищого ельфа",
      engName: "High Elf Cantrip",
      description:
        "Ви знаєте одне замовляння на ваш вибір зі списку заклинань чарівника. Інтелект є вашою заклинальною характеристикою для нього.",
      shortDescription: "1 замовляння чарівника",
      displayType: [FeatureDisplayType.PASSIVE],
    },
    {
      name: "Додаткова мова",
      engName: "Extra Language",
      description:
        "Ви можете розмовляти, читати та писати однією додатковою мовою на ваш вибір.",
      shortDescription: "+1 мова",
      displayType: [FeatureDisplayType.PASSIVE],
    },

    // ============ DWARF SUBRACE FEATURES ============

    // --- HILL DWARF ---
    {
      name: "Дварфська витривалість",
      engName: "Dwarven Toughness (Hill Dwarf Subrace)",
      description:
        "Максимум ваших хіт-поінтів збільшується на 1, і він збільшується на 1 додатково щоразу, коли ви отримуєте рівень.",
      shortDescription: "+1 HP на рівень",
      displayType: [FeatureDisplayType.PASSIVE],
    },

    // --- MOUNTAIN DWARF ---
    {
      name: "Дварфське бронарське навчання",
      engName: "Dwarven Armor Training (Mountain Dwarf Subrace)",
      description: "Ви володієте легкими та середніми обладунками.",
      shortDescription: "Володіння легкими та середніми обладунками",
      displayType: [FeatureDisplayType.PASSIVE],
    },

    // --- DUERGAR (GRAY DWARF) ---
    {
      name: "Вищий темнозір (Дуергар)",
      engName: "Superior Darkvision (Duergar)",
      description: "Ваш темнозір має радіус 120 футів.",
      shortDescription: "Темнозір 120 футів",
      displayType: [FeatureDisplayType.PASSIVE],
    },
    {
      name: "Стійкість дуергара",
      engName: "Duergar Resilience (Duergar Subrace)",
      description:
        "Ви маєте <a href=\"/rules/abilities#advantage-and-disadvantage--advantage-and-disadvantage\">перевагу</a> на ряткидки проти ілюзій та проти того, щоб бути зачарованим або <a href=\"/rules/conditions#condition-paralyzed\">паралізованим</a>.",
      shortDescription:
        "Перевага на ряткидки проти ілюзій, зачарування та паралічу",
      displayType: [FeatureDisplayType.PASSIVE],
    },
    {
      name: "Магія дуергара",
      engName: "Duergar Magic (Duergar Subrace)",
      description:
        'Коли ви досягаєте 3-го рівня, ви можете один раз використати заклинання <a href="/spell/1289">Збільшення/Зменшення [Enlarge/Reduce]</a> на себе. Коли ви досягаєте 5-го рівня, ви також можете один раз використати заклинання <a href="/spell/1276">Невидимість [Invisibility]</a> на себе. Після використання кожного з цих заклять ви не можете використовувати це заклинання знову, доки не завершите довгий відпочинок. Інтелект є вашою характеристикою для цих заклинань.',
      shortDescription: "Збільшення/Зменшення та Невидимість (тільки на себе)",
      displayType: [FeatureDisplayType.PASSIVE],
      limitedUsesPer: RestType.LONG_REST,
      givesSpells: {
        connect: [{ engName_ruleset: { engName: "Enlarge/Reduce", ruleset: ACTIVE_RULESET } }, { engName_ruleset: { engName: "Invisibility", ruleset: ACTIVE_RULESET } }],
      },
    },

    // ============ HALFLING SUBRACE FEATURES ============

    // --- LIGHTFOOT HALFLING ---
    {
      name: "Природна непомітність",
      engName: "Naturally Stealthy",
      description:
        "Ви можете спробувати сховатися, навіть коли ви приховані лише істотою, яка щонайменше на один розмір більша за вас.",
      shortDescription: "Можна ховатися за більшими істотами",
      displayType: [FeatureDisplayType.PASSIVE],
    },

    // --- STOUT HALFLING ---
    {
      name: "Стійкість кремезних",
      engName: "Stout Resilience",
      description:
        "Ви маєте <a href=\"/rules/abilities#advantage-and-disadvantage--advantage-and-disadvantage\">перевагу</a> на ряткидки проти отрути та <a href=\"/rules/combat?term=Resistance#making-an-attack--damage-and-healing--resistance-and-vulnerability\">опір</a> до отруйної шкоди.",
      shortDescription: "Перевага на ряткидки проти отрути + опір до отрути",
      displayType: [FeatureDisplayType.PASSIVE],
    },

    // --- GHOSTWISE HALFLING ---
    {
      name: "Безмовна мова",
      engName: "Silent Speech",
      description:
        "Ви можете телепатично спілкуватися з будь-якою істотою в межах 30 футів від вас. Істота розуміє вас, тільки якщо ви обидва знаєте спільну мову. Ви можете одночасно говорити телепатично тільки з однією істотою.",
      shortDescription: "Телепатія 30 футів (спільна мова потрібна)",
      displayType: [FeatureDisplayType.PASSIVE],
    },

    // ============ GNOME SUBRACE FEATURES ============

    // --- FOREST GNOME ---
    {
      name: "Природний ілюзіоніст",
      engName: "Natural Illusionist",
      description:
        'Ви знаєте замовляння <a href="/spell/1351">Мала ілюзія [Minor Illusion]</a>. Інтелект є вашою заклинальною характеристикою для нього.',
      shortDescription: "Замовляння <a href=\"/spells/minor-illusion\">Мала ілюзія [Minor Illusion]</a>",
      displayType: [FeatureDisplayType.PASSIVE],
      givesSpells: {
        connect: [{ engName_ruleset: { engName: "Minor Illusion", ruleset: ACTIVE_RULESET } }],
      },
    },
    {
      name: "Розмова з малими звірами",
      engName: "Speak with Small Beasts",
      description:
        "За допомогою звуків і жестів ви можете передавати прості ідеї малим або менше за розміром звірам.",
      shortDescription: "Спілкування з малими звірами",
      displayType: [FeatureDisplayType.PASSIVE],
    },

    // --- ROCK GNOME ---
    {
      name: "Знання ремісника",
      engName: "Artificer's Lore",
      description:
        "Коли ви робите перевірку Інтелекту (Історія [History]), повʼязану з магічними предметами, алхімічними обʼєктами або технологічними пристроями, ви можете додати подвійний бонус майстерності замість будь-якого бонуса майстерності, який ви зазвичай застосовуєте.",
      shortDescription:
        "Подвійна майстерність на Історію про магічні/технологічні предмети",
      displayType: [FeatureDisplayType.PASSIVE],
    },
    {
      name: "Майстер-винахідник",
      engName: "Tinker",
      description:
        "Ви володієте інструментами ремісника (інструменти тінкера). Використовуючи ці інструменти, ви можете витратити 1 годину та матеріали на суму 10 зм, щоб створити Крихітний механічний пристрій (КС 5). Пристрій перестає працювати через 24 години (якщо ви не витратите 1 годину на його ремонт) або коли ви використовуєте свою дію, щоб його демонтувати; у цей час ви можете повернути використані матеріали. Ви можете мати до трьох таких пристроїв активними одночасно. Коли ви створюєте пристрій, виберіть один з наступних варіантів: Заводна іграшка, Запальничка, Музична скринька.",
      shortDescription: "Створення крихітних механічних пристроїв",
      displayType: [FeatureDisplayType.PASSIVE],
    },

    // --- DEEP GNOME (SVIRFNEBLIN) ---
    {
      name: "Вищий темнозір (Глибинний гном)",
      engName: "Superior Darkvision (Deep Gnome)",
      description: "Ваш темнозір має радіус 120 футів.",
      shortDescription: "Темнозір 120 футів",
      displayType: [FeatureDisplayType.PASSIVE],
    },
    {
      name: "Камʼяний камуфляж",
      engName: "Stone Camouflage (Deep Gnome Subrace)",
      description:
        "Ви маєте <a href=\"/rules/abilities#advantage-and-disadvantage--advantage-and-disadvantage\">перевагу</a> на перевірки Спритності (Непомітність [Stealth]), щоб сховатися в камʼянистій місцевості.",
      shortDescription: "Перевага на Непомітність у камʼянистій місцевості",
      displayType: [FeatureDisplayType.PASSIVE],
    },

    // ============ DRAGONBORN (FIZBAN'S) SUBRACE FEATURES ============

    // --- CHROMATIC DRAGONBORN ---
    {
      name: "Хроматичне огородження",
      engName: "Chromatic Warding",
      description:
        "Починаючи з 5-го рівня, ви можете дією спрямувати драконячу енергію на власний захист. Протягом 1 хвилини ви отримуєте імунітет до типу шкоди, визначеного вашим Chromatic Ancestry. Після використання ви не можете повторити цю здібність до завершення тривалого відпочинку.",
      shortDescription: "Дією отримайте на хвилину імунітет до типу шкоди свого хроматичного предка; з 5-го рівня, раз між тривалими відпочинками.",
      displayType: [FeatureDisplayType.ACTION],
      limitedUsesPer: RestType.LONG_REST,
      usesCount: 1,
    },

    // --- METALLIC DRAGONBORN ---
    {
      name: "Металеве дихання",
      engName: "Metallic Breath Weapon",
      description:
        "На 5-му рівні ви отримуєте друге дихання. Коли виконуєте <a href=\"/rules/combat#actions-in-combat--attack\">дію Атака</a> у свій хід, можете замінити одну атаку видихом у конусі 15 футів. СК ряткидка дорівнює 8 + ваш модифікатор Статури + ваш Бонус Майстерності. При кожному використанні оберіть один варіант.\n\n**Enervating Breath.** Кожна істота в конусі має пройти ряткидок Статури або стати <a href=\"/rules/conditions#condition-incapacitated\">Недієздатною</a> до початку вашого наступного ходу.\n\n**Repulsion Breath.** Кожна істота в конусі має пройти ряткидок Сили або бути відштовхнутою на 20 футів від вас і стати <a href=\"/rules/conditions#condition-prone\">Поваленою</a>.\n\nПісля використання Metallic Breath Weapon ви не можете застосувати його знову до завершення тривалого відпочинку. Це окреме обмеження від звичайного дихання.",
      shortDescription: "Замініть одну атаку конусом 15 футів: Недієздатність або відштовхування на 20 футів і Повалення. З 5-го рівня, раз між тривалими відпочинками.",
      displayType: [FeatureDisplayType.ACTION],
      limitedUsesPer: RestType.SHORT_REST,
    },

    // --- GEM DRAGONBORN ---
    {
      name: "Псионічний розум",
      engName: "Psionic Mind",
      description:
        "Ви можете надсилати телепатичні повідомлення будь-якій істоті, яку бачите в межах 30 футів від вас. Спільна мова не потрібна, але істота має розуміти хоча б одну мову, щоб зрозуміти ці повідомлення.",
      shortDescription: "Надсилайте телепатичні повідомлення видимій істоті в межах 30 футів, яка розуміє хоча б одну мову.",
      displayType: [FeatureDisplayType.PASSIVE],
    },
    {
      name: "Самоцвітний політ",
      engName: "Gem Flight",
      description:
        "Починаючи з 5-го рівня, ви можете <a href=\"/rules/combat#order-of-combat--bonus-actions\">бонусною дією</a> проявити примарні крила на своєму тілі. Вони тривають 1 хвилину. Протягом цього часу швидкість польоту дорівнює вашій швидкості ходьби, і ви можете зависати. Після використання ви не можете повторити цю здібність до завершення тривалого відпочинку.",
      shortDescription: "Бонусною дією отримайте на хвилину політ зі швидкістю ходьби та зависання; з 5-го рівня, раз між тривалими відпочинками.",
      displayType: [FeatureDisplayType.BONUSACTION],
      limitedUsesPer: RestType.LONG_REST,
      usesCount: 1,
    },
  ];

  for (const feature of features) {
    try {
      const normalized = normalizeFeatureCreateInput(feature);
      await prisma.feature.upsert({
        where: { engName: normalized.engName },
        update: normalized,
        create: normalized,
      });
    } catch (error) {
      console.error("💀 ПОМИЛКА на фічі підраси:", feature.name);
      console.error("📝 Feature дані:", JSON.stringify(feature, null, 2));
      console.error("⚠️ Error:", error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error("🔍 Prisma Error Code:", error.code);
        console.error("🔍 Meta:", error.meta);

        if (error.code === "P2025") {
          console.error(
            "❌ Не знайдено record(s) для connect:",
            error.meta?.cause,
          );
        }
      }
    }
  }

  console.log(`✅ Додано ${features.length} фіч підрас!`);
};
