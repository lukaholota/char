import { PrismaClient, Subclasses } from "@prisma/client"

type NewChoiceOption = {
  groupName: string
  optionName: string
  optionNameEng: string
  featureEngName: string
}

type SubclassChoiceLink = {
  subclass: Subclasses
  optionNameEng: string
  levelsGranted: number[]
}

export const seedSubclassChoiceOptions = async (prisma: PrismaClient) => {
  console.log("Створюємо вибори підкласів...")

  const newChoiceOptions: NewChoiceOption[] = [
    // Arcane Shot options
    { groupName: "Арканні постріли", optionName: "Вигнання стрілою", optionNameEng: "Banishing Arrow (Arcane Shot)", featureEngName: "Banishing Arrow" },
    { groupName: "Арканні постріли", optionName: "Зваблива стріла", optionNameEng: "Beguiling Arrow (Arcane Shot)", featureEngName: "Beguiling Arrow" },
    { groupName: "Арканні постріли", optionName: "Розривна стріла", optionNameEng: "Bursting Arrow (Arcane Shot)", featureEngName: "Bursting Arrow" },
    { groupName: "Арканні постріли", optionName: "Ослаблювальна стріла", optionNameEng: "Enfeebling Arrow (Arcane Shot)", featureEngName: "Enfeebling Arrow" },
    { groupName: "Арканні постріли", optionName: "Хапальна стріла", optionNameEng: "Grasping Arrow (Arcane Shot)", featureEngName: "Grasping Arrow" },
    { groupName: "Арканні постріли", optionName: "Пронизувальна стріла", optionNameEng: "Piercing Arrow (Arcane Shot)", featureEngName: "Piercing Arrow" },
    { groupName: "Арканні постріли", optionName: "Стріла-наведення", optionNameEng: "Seeking Arrow (Arcane Shot)", featureEngName: "Seeking Arrow" },
    { groupName: "Арканні постріли", optionName: "Тіньова стріла", optionNameEng: "Shadow Arrow (Arcane Shot)", featureEngName: "Shadow Arrow" },

    // Battle Master maneuvers
    { groupName: "Маневри майстра бою", optionName: "Засідка", optionNameEng: "Ambush (Maneuver)", featureEngName: "Ambush" },
    { groupName: "Маневри майстра бою", optionName: "Пастка й обмін", optionNameEng: "Bait and Switch (Maneuver)", featureEngName: "Bait and Switch" },
    { groupName: "Маневри майстра бою", optionName: "Готовність", optionNameEng: "Brace (Maneuver)", featureEngName: "Brace" },
    { groupName: "Маневри майстра бою", optionName: "Наказ атакувати", optionNameEng: "Commander's Strike (Maneuver)", featureEngName: "Commander's Strike" },
    { groupName: "Маневри майстра бою", optionName: "Владна присутність", optionNameEng: "Commanding Presence (Maneuver)", featureEngName: "Commanding Presence" },
    { groupName: "Маневри майстра бою", optionName: "Роззброювальний удар", optionNameEng: "Disarming Attack (Maneuver)", featureEngName: "Disarming Attack" },
    { groupName: "Маневри майстра бою", optionName: "Відволікаючий удар", optionNameEng: "Distracting Strike (Maneuver)", featureEngName: "Distracting Strike" },
    { groupName: "Маневри майстра бою", optionName: "Ухильні кроки", optionNameEng: "Evasive Footwork (Maneuver)", featureEngName: "Evasive Footwork" },
    { groupName: "Маневри майстра бою", optionName: "Обманний удар", optionNameEng: "Feinting Attack (Maneuver)", featureEngName: "Feinting Attack" },
    { groupName: "Маневри майстра бою", optionName: "Дратівливий удар", optionNameEng: "Goading Attack (Maneuver)", featureEngName: "Goading Attack" },
    { groupName: "Маневри майстра бою", optionName: "Захоплювальний удар", optionNameEng: "Grappling Strike (Maneuver)", featureEngName: "Grappling Strike" },
    { groupName: "Маневри майстра бою", optionName: "Укол із випаду", optionNameEng: "Lunging Attack (Maneuver)", featureEngName: "Lunging Attack" },
    { groupName: "Маневри майстра бою", optionName: "Маневровий удар", optionNameEng: "Maneuvering Attack (Maneuver)", featureEngName: "Maneuvering Attack" },
    { groupName: "Маневри майстра бою", optionName: "Лякаючий удар", optionNameEng: "Menacing Attack (Maneuver)", featureEngName: "Menacing Attack" },
    { groupName: "Маневри майстра бою", optionName: "Парирування", optionNameEng: "Parry (Maneuver)", featureEngName: "Parry" },
    { groupName: "Маневри майстра бою", optionName: "Точний удар", optionNameEng: "Precision Attack (Maneuver)", featureEngName: "Precision Attack" },
    { groupName: "Маневри майстра бою", optionName: "Відштовхувальний удар", optionNameEng: "Pushing Attack (Maneuver)", featureEngName: "Pushing Attack" },
    { groupName: "Маневри майстра бою", optionName: "Швидкий кидок", optionNameEng: "Quick Toss (Maneuver)", featureEngName: "Quick Toss" },
    { groupName: "Маневри майстра бою", optionName: "Підбадьорення", optionNameEng: "Rally (Maneuver)", featureEngName: "Rally" },
    { groupName: "Маневри майстра бою", optionName: "Відплата", optionNameEng: "Riposte (Maneuver)", featureEngName: "Riposte" },
    { groupName: "Маневри майстра бою", optionName: "Розмашистий удар", optionNameEng: "Sweeping Attack (Maneuver)", featureEngName: "Sweeping Attack" },
    { groupName: "Маневри майстра бою", optionName: "Тактична оцінка", optionNameEng: "Tactical Assessment (Maneuver)", featureEngName: "Tactical Assessment" },
    { groupName: "Маневри майстра бою", optionName: "Підніжка", optionNameEng: "Trip Attack (Maneuver)", featureEngName: "Trip Attack" },

    // Rune options
    { groupName: "Руни велетнів", optionName: "Руна хмари", optionNameEng: "Cloud Rune (Rune)", featureEngName: "Cloud Rune" },
    { groupName: "Руни велетнів", optionName: "Руна вогню", optionNameEng: "Fire Rune (Rune)", featureEngName: "Fire Rune" },
    { groupName: "Руни велетнів", optionName: "Руна холоду", optionNameEng: "Frost Rune (Rune)", featureEngName: "Frost Rune" },
    { groupName: "Руни велетнів", optionName: "Руна каменю", optionNameEng: "Stone Rune (Rune)", featureEngName: "Stone Rune" },
    { groupName: "Руни велетнів", optionName: "Руна пагорба", optionNameEng: "Hill Rune (Rune)", featureEngName: "Hill Rune" },
    { groupName: "Руни велетнів", optionName: "Руна бурі", optionNameEng: "Storm Rune (Rune)", featureEngName: "Storm Rune" },

    // Circle of the Land biomes
    { groupName: "Коло землі (біом)", optionName: "Арктика", optionNameEng: "Circle Spells — Arctic", featureEngName: "Circle Spells — Arctic" },
    { groupName: "Коло землі (біом)", optionName: "Узбережжя", optionNameEng: "Circle Spells — Coast", featureEngName: "Circle Spells — Coast" },
    { groupName: "Коло землі (біом)", optionName: "Пустеля", optionNameEng: "Circle Spells — Desert", featureEngName: "Circle Spells — Desert" },
    { groupName: "Коло землі (біом)", optionName: "Ліс", optionNameEng: "Circle Spells — Forest", featureEngName: "Circle Spells — Forest" },
    { groupName: "Коло землі (біом)", optionName: "Рівнини", optionNameEng: "Circle Spells — Grassland", featureEngName: "Circle Spells — Grassland" },
    { groupName: "Коло землі (біом)", optionName: "Гори", optionNameEng: "Circle Spells — Mountain", featureEngName: "Circle Spells — Mountain" },
    { groupName: "Коло землі (біом)", optionName: "Болото", optionNameEng: "Circle Spells — Swamp", featureEngName: "Circle Spells — Swamp" },
    { groupName: "Коло землі (біом)", optionName: "Підморок", optionNameEng: "Circle Spells — Underdark", featureEngName: "Circle Spells — Underdark" },

    // Totem Spirit (Barbarian)
    { groupName: "Тотемний дух", optionName: "Ведмідь (тотем)", optionNameEng: "Totem Spirit: Bear", featureEngName: "Totem Spirit: Bear" },
    { groupName: "Тотемний дух", optionName: "Орел (тотем)", optionNameEng: "Totem Spirit: Eagle", featureEngName: "Totem Spirit: Eagle" },
    { groupName: "Тотемний дух", optionName: "Лось (тотем)", optionNameEng: "Totem Spirit: Elk", featureEngName: "Totem Spirit: Elk" },
    { groupName: "Тотемний дух", optionName: "Тигр (тотем)", optionNameEng: "Totem Spirit: Tiger", featureEngName: "Totem Spirit: Tiger" },
    { groupName: "Тотемний дух", optionName: "Вовк (тотем)", optionNameEng: "Totem Spirit: Wolf", featureEngName: "Totem Spirit: Wolf" },

    // Aspect of the Beast (Barbarian)
    { groupName: "Аспект звіра", optionName: "Ведмідь (аспект)", optionNameEng: "Aspect of the Beast: Bear", featureEngName: "Aspect of the Beast: Bear" },
    { groupName: "Аспект звіра", optionName: "Орел (аспект)", optionNameEng: "Aspect of the Beast: Eagle", featureEngName: "Aspect of the Beast: Eagle" },
    { groupName: "Аспект звіра", optionName: "Лось (аспект)", optionNameEng: "Aspect of the Beast: Elk", featureEngName: "Aspect of the Beast: Elk" },
    { groupName: "Аспект звіра", optionName: "Тигр (аспект)", optionNameEng: "Aspect of the Beast: Tiger", featureEngName: "Aspect of the Beast: Tiger" },
    { groupName: "Аспект звіра", optionName: "Вовк (аспект)", optionNameEng: "Aspect of the Beast: Wolf", featureEngName: "Aspect of the Beast: Wolf" },

    // Totemic Attunement (Barbarian)
    { groupName: "Настроювання тотема", optionName: "Ведмідь (настроювання)", optionNameEng: "Totemic Attunement: Bear", featureEngName: "Totemic Attunement: Bear" },
    { groupName: "Настроювання тотема", optionName: "Орел (настроювання)", optionNameEng: "Totemic Attunement: Eagle", featureEngName: "Totemic Attunement: Eagle" },
    { groupName: "Настроювання тотема", optionName: "Лось (настроювання)", optionNameEng: "Totemic Attunement: Elk", featureEngName: "Totemic Attunement: Elk" },
    { groupName: "Настроювання тотема", optionName: "Тигр (настроювання)", optionNameEng: "Totemic Attunement: Tiger", featureEngName: "Totemic Attunement: Tiger" },
    { groupName: "Настроювання тотема", optionName: "Вовк (настроювання)", optionNameEng: "Totemic Attunement: Wolf", featureEngName: "Totemic Attunement: Wolf" },

    // Draconic Ancestry (Sorcerer)
    { groupName: "Дракон-предок", optionName: "Чорний дракон (кислота)", optionNameEng: "Black Dragon (Acid)", featureEngName: "Draconic Ancestry" },
    { groupName: "Дракон-предок", optionName: "Синій дракон (блискавка)", optionNameEng: "Blue Dragon (Lightning)", featureEngName: "Draconic Ancestry" },
    { groupName: "Дракон-предок", optionName: "Латунний дракон (вогонь)", optionNameEng: "Brass Dragon (Fire)", featureEngName: "Draconic Ancestry" },
    { groupName: "Дракон-предок", optionName: "Бронзовий дракон (блискавка)", optionNameEng: "Bronze Dragon (Lightning)", featureEngName: "Draconic Ancestry" },
    { groupName: "Дракон-предок", optionName: "Мідний дракон (кислота)", optionNameEng: "Copper Dragon (Acid)", featureEngName: "Draconic Ancestry" },
    { groupName: "Дракон-предок", optionName: "Золотий дракон (вогонь)", optionNameEng: "Gold Dragon (Fire)", featureEngName: "Draconic Ancestry" },
    { groupName: "Дракон-предок", optionName: "Зелений дракон (отрута)", optionNameEng: "Green Dragon (Poison)", featureEngName: "Draconic Ancestry" },
    { groupName: "Дракон-предок", optionName: "Червоний дракон (вогонь)", optionNameEng: "Red Dragon (Fire)", featureEngName: "Draconic Ancestry" },
    { groupName: "Дракон-предок", optionName: "Срібний дракон (холод)", optionNameEng: "Silver Dragon (Cold)", featureEngName: "Draconic Ancestry" },
    { groupName: "Дракон-предок", optionName: "Білий дракон (холод)", optionNameEng: "White Dragon (Cold)", featureEngName: "Draconic Ancestry" },
  ]

  const subclassLinks: SubclassChoiceLink[] = [
    // Arcane Archer
    { subclass: Subclasses.ARCANE_ARCHER, optionNameEng: "Banishing Arrow (Arcane Shot)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.ARCANE_ARCHER, optionNameEng: "Beguiling Arrow (Arcane Shot)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.ARCANE_ARCHER, optionNameEng: "Bursting Arrow (Arcane Shot)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.ARCANE_ARCHER, optionNameEng: "Enfeebling Arrow (Arcane Shot)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.ARCANE_ARCHER, optionNameEng: "Grasping Arrow (Arcane Shot)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.ARCANE_ARCHER, optionNameEng: "Piercing Arrow (Arcane Shot)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.ARCANE_ARCHER, optionNameEng: "Seeking Arrow (Arcane Shot)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.ARCANE_ARCHER, optionNameEng: "Shadow Arrow (Arcane Shot)", levelsGranted: [3, 7, 10, 15] },

    // Battle Master maneuvers
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Ambush (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Bait and Switch (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Brace (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Commander's Strike (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Commanding Presence (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Disarming Attack (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Distracting Strike (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Evasive Footwork (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Feinting Attack (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Goading Attack (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Grappling Strike (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Lunging Attack (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Maneuvering Attack (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Menacing Attack (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Parry (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Precision Attack (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Pushing Attack (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Quick Toss (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Rally (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Riposte (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Sweeping Attack (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Tactical Assessment (Maneuver)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.BATTLE_MASTER, optionNameEng: "Trip Attack (Maneuver)", levelsGranted: [3, 7, 10, 15] },

    // Rune Knight runes
    { subclass: Subclasses.RUNE_KNIGHT, optionNameEng: "Cloud Rune (Rune)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.RUNE_KNIGHT, optionNameEng: "Fire Rune (Rune)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.RUNE_KNIGHT, optionNameEng: "Frost Rune (Rune)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.RUNE_KNIGHT, optionNameEng: "Stone Rune (Rune)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.RUNE_KNIGHT, optionNameEng: "Hill Rune (Rune)", levelsGranted: [3, 7, 10, 15] },
    { subclass: Subclasses.RUNE_KNIGHT, optionNameEng: "Storm Rune (Rune)", levelsGranted: [3, 7, 10, 15] },

    // Circle of the Land biomes
    { subclass: Subclasses.CIRCLE_OF_THE_LAND, optionNameEng: "Circle Spells — Arctic", levelsGranted: [3] },
    { subclass: Subclasses.CIRCLE_OF_THE_LAND, optionNameEng: "Circle Spells — Coast", levelsGranted: [3] },
    { subclass: Subclasses.CIRCLE_OF_THE_LAND, optionNameEng: "Circle Spells — Desert", levelsGranted: [3] },
    { subclass: Subclasses.CIRCLE_OF_THE_LAND, optionNameEng: "Circle Spells — Forest", levelsGranted: [3] },
    { subclass: Subclasses.CIRCLE_OF_THE_LAND, optionNameEng: "Circle Spells — Grassland", levelsGranted: [3] },
    { subclass: Subclasses.CIRCLE_OF_THE_LAND, optionNameEng: "Circle Spells — Mountain", levelsGranted: [3] },
    { subclass: Subclasses.CIRCLE_OF_THE_LAND, optionNameEng: "Circle Spells — Swamp", levelsGranted: [3] },
    { subclass: Subclasses.CIRCLE_OF_THE_LAND, optionNameEng: "Circle Spells — Underdark", levelsGranted: [3] },

    // Champion additional fighting style at 10 level
    { subclass: Subclasses.CHAMPION, optionNameEng: "Archery", levelsGranted: [10] },
    { subclass: Subclasses.CHAMPION, optionNameEng: "Blind Fighting", levelsGranted: [10] },
    { subclass: Subclasses.CHAMPION, optionNameEng: "Defense", levelsGranted: [10] },
    { subclass: Subclasses.CHAMPION, optionNameEng: "Dueling", levelsGranted: [10] },
    { subclass: Subclasses.CHAMPION, optionNameEng: "Great Weapon Fighting", levelsGranted: [10] },
    { subclass: Subclasses.CHAMPION, optionNameEng: "Interception", levelsGranted: [10] },
    { subclass: Subclasses.CHAMPION, optionNameEng: "Protection", levelsGranted: [10] },
    { subclass: Subclasses.CHAMPION, optionNameEng: "Superior Technique", levelsGranted: [10] },
    { subclass: Subclasses.CHAMPION, optionNameEng: "Thrown Weapon Fighting", levelsGranted: [10] },
    { subclass: Subclasses.CHAMPION, optionNameEng: "Two-Weapon Fighting", levelsGranted: [10] },
    { subclass: Subclasses.CHAMPION, optionNameEng: "Unarmed Fighting", levelsGranted: [10] },
    { subclass: Subclasses.CHAMPION, optionNameEng: "Druidic Warrior", levelsGranted: [10] },
    { subclass: Subclasses.CHAMPION, optionNameEng: "Blessed Warrior", levelsGranted: [10] },

    // Totem Spirit (Barbarian)
    { subclass: Subclasses.PATH_OF_THE_TOTEM_WARRIOR, optionNameEng: "Totem Spirit: Bear", levelsGranted: [3] },
    { subclass: Subclasses.PATH_OF_THE_TOTEM_WARRIOR, optionNameEng: "Totem Spirit: Eagle", levelsGranted: [3] },
    { subclass: Subclasses.PATH_OF_THE_TOTEM_WARRIOR, optionNameEng: "Totem Spirit: Elk", levelsGranted: [3] },
    { subclass: Subclasses.PATH_OF_THE_TOTEM_WARRIOR, optionNameEng: "Totem Spirit: Tiger", levelsGranted: [3] },
    { subclass: Subclasses.PATH_OF_THE_TOTEM_WARRIOR, optionNameEng: "Totem Spirit: Wolf", levelsGranted: [3] },

    // Aspect of the Beast (Barbarian)
    { subclass: Subclasses.PATH_OF_THE_TOTEM_WARRIOR, optionNameEng: "Aspect of the Beast: Bear", levelsGranted: [6] },
    { subclass: Subclasses.PATH_OF_THE_TOTEM_WARRIOR, optionNameEng: "Aspect of the Beast: Eagle", levelsGranted: [6] },
    { subclass: Subclasses.PATH_OF_THE_TOTEM_WARRIOR, optionNameEng: "Aspect of the Beast: Elk", levelsGranted: [6] },
    { subclass: Subclasses.PATH_OF_THE_TOTEM_WARRIOR, optionNameEng: "Aspect of the Beast: Tiger", levelsGranted: [6] },
    { subclass: Subclasses.PATH_OF_THE_TOTEM_WARRIOR, optionNameEng: "Aspect of the Beast: Wolf", levelsGranted: [6] },

    // Totemic Attunement (Barbarian)
    { subclass: Subclasses.PATH_OF_THE_TOTEM_WARRIOR, optionNameEng: "Totemic Attunement: Bear", levelsGranted: [14] },
    { subclass: Subclasses.PATH_OF_THE_TOTEM_WARRIOR, optionNameEng: "Totemic Attunement: Eagle", levelsGranted: [14] },
    { subclass: Subclasses.PATH_OF_THE_TOTEM_WARRIOR, optionNameEng: "Totemic Attunement: Elk", levelsGranted: [14] },
    { subclass: Subclasses.PATH_OF_THE_TOTEM_WARRIOR, optionNameEng: "Totemic Attunement: Tiger", levelsGranted: [14] },
    { subclass: Subclasses.PATH_OF_THE_TOTEM_WARRIOR, optionNameEng: "Totemic Attunement: Wolf", levelsGranted: [14] },

    // Draconic Ancestry (Sorcerer)
    { subclass: Subclasses.DRACONIC_BLOODLINE, optionNameEng: "Black Dragon (Acid)", levelsGranted: [1] },
    { subclass: Subclasses.DRACONIC_BLOODLINE, optionNameEng: "Blue Dragon (Lightning)", levelsGranted: [1] },
    { subclass: Subclasses.DRACONIC_BLOODLINE, optionNameEng: "Brass Dragon (Fire)", levelsGranted: [1] },
    { subclass: Subclasses.DRACONIC_BLOODLINE, optionNameEng: "Bronze Dragon (Lightning)", levelsGranted: [1] },
    { subclass: Subclasses.DRACONIC_BLOODLINE, optionNameEng: "Copper Dragon (Acid)", levelsGranted: [1] },
    { subclass: Subclasses.DRACONIC_BLOODLINE, optionNameEng: "Gold Dragon (Fire)", levelsGranted: [1] },
    { subclass: Subclasses.DRACONIC_BLOODLINE, optionNameEng: "Green Dragon (Poison)", levelsGranted: [1] },
    { subclass: Subclasses.DRACONIC_BLOODLINE, optionNameEng: "Red Dragon (Fire)", levelsGranted: [1] },
    { subclass: Subclasses.DRACONIC_BLOODLINE, optionNameEng: "Silver Dragon (Cold)", levelsGranted: [1] },
    { subclass: Subclasses.DRACONIC_BLOODLINE, optionNameEng: "White Dragon (Cold)", levelsGranted: [1] },
  ]

  for (const option of newChoiceOptions) {
    const feature = await prisma.feature.findUnique({ where: { engName: option.featureEngName } })
    if (!feature) {
      console.warn(`Feature ${option.featureEngName} не знайдено для опції ${option.optionNameEng}`)
      continue
    }

    const choice = await prisma.choiceOption.upsert({
      where: { optionNameEng: option.optionNameEng },
      update: {
        groupName: option.groupName,
        optionName: option.optionName,
      },
      create: {
        groupName: option.groupName,
        optionName: option.optionName,
        optionNameEng: option.optionNameEng,
      },
    })

    // пересоздаємо зв’язок feature <-> choiceOption, щоб уникнути дублікатів
    await prisma.choiceOptionFeature.deleteMany({ where: { choiceOptionId: choice.choiceOptionId } })
    await prisma.choiceOptionFeature.create({
      data: {
        choiceOptionId: choice.choiceOptionId,
        feature: { connect: { engName: option.featureEngName } },
      },
    })
  }

  // Окремо додаємо прив’язки до підкласів
  for (const link of subclassLinks) {
    const subclass = await prisma.subclass.findFirst({ where: { name: link.subclass } })
    const choiceOption = await prisma.choiceOption.findUnique({ where: { optionNameEng: link.optionNameEng } })
    if (!subclass || !choiceOption) {
      console.warn(`Пропуск SubclassChoiceOption для ${link.subclass} -> ${link.optionNameEng}`)
      continue
    }

    const existing = await prisma.subclassChoiceOption.findFirst({
      where: { subclassId: subclass.subclassId, choiceOptionId: choiceOption.choiceOptionId },
    })

    const data = {
      subclassId: subclass.subclassId,
      choiceOptionId: choiceOption.choiceOptionId,
      levelsGranted: link.levelsGranted,
    }

    if (existing) {
      await prisma.subclassChoiceOption.update({
        where: { optionId: existing.optionId },
        data,
      })
    } else {
      await prisma.subclassChoiceOption.create({ data })
    }
  }

  console.log("Готово. Оновили вибори для підкласів.")
}
