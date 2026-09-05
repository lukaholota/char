/**
 * KR16.5 — містки між нашим каталогом спорядження й `items-base.json` пінутої ревізії.
 *
 * Тут лежать тільки відповідності й іменовані винятки. Порівняння — у
 * `compare-equipment.ts`; воно падає на будь-якому рядку, якого немає ні в корпусі, ні
 * в цих переліках, тому «забули внести» неможливо переплутати з «зійшлося».
 */

import { EquipmentPackCategory, WeaponCategory } from "@prisma/client";

/// Книга, з якої беремо базовий предмет для кожної редакції нашого каталогу.
export const ARMOR_SOURCE_BOOK = { RULES_2014: "PHB", RULES_2024: "XPHB" } as const;

/// Категорія обладунку → назва рядка в книзі. Обидві редакції зовуть його однаково, а от
/// наш каталог 2014 зве сімку з них коротше — `Padded` замість `Padded Armor`. Це різниця
/// в назві, не в правилах, і міст тут саме для того, щоб її не переплутати з розбіжністю.
export const ARMOR_NAME_IN_SOURCE: Record<string, string> = {
  PADDED: "Padded Armor",
  LEATHER: "Leather Armor",
  STUDDED_LEATHER: "Studded Leather Armor",
  HIDE: "Hide Armor",
  CHAIN_SHIRT: "Chain Shirt",
  SCALE_MAIL: "Scale Mail",
  BREASTPLATE: "Breastplate",
  HALF_PLATE: "Half Plate Armor",
  RING_MAIL: "Ring Mail",
  CHAIN_MAIL: "Chain Mail",
  SPLINT: "Splint Armor",
  PLATE: "Plate Armor",
  SHIELD: "Shield",
};

/// Рядки каталогу обладунків, яких у книзі немає й бути не може: це не спорядження, а
/// джерела КБ, які проєкт зробив вибираними записами (див. коментар у `ArmorCategory`).
export const ARMOR_ROWS_OUTSIDE_THE_BOOK: Record<string, string> = {
  HOMEBREW: "власний рядок користувача, не предмет книги",
  UNARMORED_DEFENSE_MONK: "класова риса Ченця як джерело КБ",
  UNARMORED_DEFENSE_BARBARIAN: "класова риса Варвара як джерело КБ",
  NATURAL_ARMOR_TORTLE: "природний обладунок народу, не спорядження",
  NATURAL_ARMOR_13_DEX: "природний обладунок народу, не спорядження",
  NATURAL_ARMOR_12_DEX: "природний обладунок народу, не спорядження",
  NATURAL_ARMOR_12_CON: "природний обладунок народу, не спорядження",
};

/// Вогнепал 2014 приїхав не з PHB, а з DMG, і одна назва там інша: наш
/// `Pistol (Renaissance)` — це `Pistol` книги. Решта збігається дослівно, але книгу однаково
/// треба назвати: за замовчуванням звірка шукає в PHB і мовчки нічого б не знайшла.
export const WEAPON_IN_SOURCE: Partial<Record<WeaponCategory, { name: string; book: string }>> = {
  PISTOL_RENAISSANCE: { name: "Pistol", book: "DMG" },
  MUSKET: { name: "Musket", book: "DMG" },
  PISTOL_AUTOMATIC: { name: "Automatic Pistol", book: "DMG" },
  REVOLVER: { name: "Revolver", book: "DMG" },
  RIFLE_HUNTING: { name: "Hunting Rifle", book: "DMG" },
  RIFLE_AUTOMATIC: { name: "Automatic Rifle", book: "DMG" },
  SHOTGUN: { name: "Shotgun", book: "DMG" },
  LASER_PISTOL: { name: "Laser Pistol", book: "DMG" },
  ANTIMATTER_RIFLE: { name: "Antimatter Rifle", book: "DMG" },
  LASER_RIFLE: { name: "Laser Rifle", book: "DMG" },
};

export const WEAPON_ROWS_OUTSIDE_THE_BOOK: Record<string, string> = {
  UNARMED_STRIKE: "беззбройний удар — правило, а не предмет; базового предмета в корпусі немає",
};

/// Коди властивостей корпусу → наш `WeaponProperty`. Зняті з `itemProperty` пінутого
/// `items-base.json`. `AF` («ammunition, firearm») лягає в ту саму AMMUNITION, бо окремого
/// значення для вогнепальних боєприпасів наш енум не має й не заводить.
export const WEAPON_PROPERTY_BY_CODE: Record<string, string> = {
  "2H": "TWO_HANDED",
  A: "AMMUNITION",
  AF: "AMMUNITION",
  BF: "BURST_FIRE",
  F: "FINESSE",
  H: "HEAVY",
  L: "LIGHT",
  LD: "LOADING",
  R: "REACH",
  RLD: "RELOAD",
  S: "SPECIAL",
  T: "THROWN",
  V: "VERSATILE",
};

export const DAMAGE_TYPE_BY_CODE: Record<string, string> = {
  A: "ACID",
  B: "BLUDGEONING",
  C: "COLD",
  F: "FIRE",
  FRC: "FORCE",
  L: "LIGHTNING",
  N: "NECROTIC",
  P: "PIERCING",
  PSN: "POISON",
  PSY: "PSYCHIC",
  R: "RADIANT",
  S: "SLASHING",
  T: "THUNDER",
};

export const ARMOR_TYPE_BY_TYPE_CODE: Record<string, string> = {
  LA: "LIGHT",
  MA: "MEDIUM",
  HA: "HEAVY",
  S: "SHIELD",
};

/// Набір спорядження нашого каталогу → предмет корпусу, який його тримає. Сім наборів PHB
/// звіряються вмістом; торбинка компонентів і книга заклинань наборами в книзі не є —
/// це окремі предмети, які проєкт завів у той самий енум, щоб творець персонажа міг
/// запропонувати їх поруч.
export const PACK_IN_SOURCE: Record<
  EquipmentPackCategory,
  { name: string; book: string; isPack: boolean } | null
> = {
  BURGLARS_PACK: { name: "Burglar's Pack", book: "PHB", isPack: true },
  DIPLOMATS_PACK: { name: "Diplomat's Pack", book: "PHB", isPack: true },
  DUNGEONEERS_PACK: { name: "Dungeoneer's Pack", book: "PHB", isPack: true },
  ENTERTAINERS_PACK: { name: "Entertainer's Pack", book: "PHB", isPack: true },
  EXPLORERS_PACK: { name: "Explorer's Pack", book: "PHB", isPack: true },
  PRIESTS_PACK: { name: "Priest's Pack", book: "PHB", isPack: true },
  SCHOLARS_PACK: { name: "Scholar's Pack", book: "PHB", isPack: true },
  COMPONENT_POUCH: { name: "Component Pouch", book: "PHB", isPack: false },
  SPELLBOOK: { name: "Spellbook", book: "PHB", isPack: false },
  HOMEBREW: null,
};

/// Українська назва рядка набору → ключ предмета в корпусі. Ключ лишається тим самим
/// рядком, що й у `packContents` (`candle|phb`), а `special:` позначає те, що корпус подає
/// вільним текстом, бо окремого предмета в книзі немає («alms box»).
///
/// Перекладу тут немає жодного нового: це рівно ті назви, які вже лежать у
/// `prisma/seed/equipmentPackSeed.ts`. Міст потрібен, щоб звірка порівнювала предмети, а не
/// рядки різними мовами.
export const PACK_ITEM_KEY_BY_NAME: Record<string, string> = {
  "Рюкзак": "backpack|phb",
  "Мішок з 1000 кульок": "ball bearings (bag of 1,000)|phb",
  "Нитка (10 футів)": "special:10 feet of string",
  "Дзвіночок": "bell|phb",
  "Свічка": "candle|phb",
  "Лом": "crowbar|phb",
  "Молоток": "hammer|phb",
  "Кілок": "piton|phb",
  "Ліхтар з капюшоном": "hooded lantern|phb",
  "Фляга олії": "oil (flask)|phb",
  "Раціони (1 день)": "rations (1 day)|phb",
  "Вогниво": "tinderbox|phb",
  "Бурдюк": "waterskin|phb",
  "Конопляна мотузка (50 футів)": "hempen rope (50 feet)|phb",
  "Скриня": "chest|phb",
  "Футляр для мап та сувоїв": "map or scroll case|phb",
  "Гарний одяг": "fine clothes|phb",
  "Пляшка чорнила": "ink (1-ounce bottle)|phb",
  "Чорнильне перо": "ink pen|phb",
  "Лампа": "lamp|phb",
  "Аркуш паперу": "paper (one sheet)|phb",
  "Флакон парфумів": "perfume (vial)|phb",
  "Сургуч": "sealing wax|phb",
  "Мило": "soap|phb",
  "Смолоскип": "torch|phb",
  "Спальний мішок": "bedroll|phb",
  "Костюм": "costume clothes|phb",
  "Набір для маскування": "disguise kit|phb",
  "Набір для приготування їжі": "mess kit|phb",
  "Ковдра": "blanket|phb",
  "Скринька для милостині": "special:alms box",
  "Брусок ладану": "special:block of incense",
  "Кадило": "special:censer",
  "Ризи": "special:vestments",
  "Книга знань": "book|phb",
  "Аркуш пергаменту": "parchment (one sheet)|phb",
  "Маленький мішечок піску": "special:little bag of sand",
  "Маленький ніж": "special:small knife",
  "Мішечок компонентів": "component pouch|phb",
  "Книга заклинань": "spellbook|phb",
  "Священний символ": "holy symbol|phb",
  "Музичний інструмент": "musical instrument|phb",
};

/// Місця, де машинне поле корпусу біднiше за його ж прозу, і права наша сторона.
/// Кожен запис несе цитату, якою це доведено, — інакше виняток не відрізнити від замовчування.
export const SOURCE_FIELD_DEFECTS: {
  pack: EquipmentPackCategory;
  itemKey: string;
  ourQuantity: number;
  sourceQuantity: number;
  provenBy: string;
}[] = [
  {
    pack: "SCHOLARS_PACK",
    itemKey: "parchment (one sheet)|phb",
    ourQuantity: 10,
    sourceQuantity: 1,
    provenBy: "10 {@item Parchment (one sheet)|phb|sheets of parchment}",
  },
];
