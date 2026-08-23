# Невідомі терміни бестіарію 2014 — партії 33–34 (добірка з 21 істоти)

Складено під час перекладу `data/aidedd/translations/monsters-2014/batch-33.json` і `batch-34.json`
(21 істота, що лишалася `pending` з непорожнім статблоком). Тут лише те, чого **немає** в
`src/lib/refs/dictionary.json` і `src/lib/refs/translation.ts`: нічого з цього не вигадано мовчки —
кожен рядок має робочий варіант, уже вписаний у партію, і підставу, з якої його складено.
Робочий варіант — не рішення: доки власник не затвердить, це кандидат.

**Контрольованих словників жоден рядок не чіпає.** Світогляди, типи істот, теги типу, мови,
режими руху, стани, типи ушкоджень і `Source`-enum узяті зі словника без винятків — гейтів
партії 33–34 не мали (усі попередні закрив власник у `questions.md`: `gem`, `bard`, `inevitable`,
`GRELL`, `WINTER_WOLF`, `SPHINX`, `HOMEBREW`, правка парсера для `sibriex`).

## 1. Назви істот, складені заново

| Англійська | Робочий варіант | Слаг | З чого складено |
|---|---|---|---|
| Wild Dog | Дикий пес | `wild-dog` | `Blink Dog → Мерехтливий пес`, `Death Dog → Двоголовий пес` — `Dog → пес` |
| Wild Dog Alpha | Дикий пес-ватажок | `wild-dog-alpha` | ядро від `wild-dog`; **`Alpha` прецеденту в корпусі не має** — «ватажок» узято як звичайне слово для вожака зграї |
| Rothé | Роте | `rothe` | **чиста транслітерація, прецеденту немає**; в українських перекладах FR трапляється й «роті» |
| Mummified Warrior | Мумійований воїн | `mummified-warrior` | `Mummy → Мумія`; форма «прикметник + воїн», бо `Mummified` — означення, а не рід (пор. `Gnoll Warrior → Гнол-воїн`, де перше слово — рід) |
| Reef Manta Ray | Рифова манта | `reef-manta-ray` | `Reef Shark → Рифова акула`; `manta ray → манта` — загальновживане |
| Giant Two-Headed Goat | Гігантська двоголова коза | `giant-two-headed-goat` | `Giant Goat → Гігантська коза` + `Death Dog → Двоголовий пес` |
| Minor Air / Water / Earth Elemental | Малий повітряний / водяний / земляний елементаль | `minor-*-elemental` | `Minor Fire Elemental → Малий вогняний елементаль` (партія 12) + `Air/Water/Earth Elemental` з каталогу |
| Ancient Shadow | Стародавня тінь | `ancient-shadow` | `Shadow → Тінь`, `Ancient X Dragon → Стародавній X` |
| Venerable Shadow | Прадавня тінь | `venerable-shadow` | **`Venerable` прецеденту не має.** Потрібне слово, відмінне від «Стародавня», бо обидві істоти стоять поруч у бестіарії, і `venerable` тут сильніший за `ancient` (ПС 2 проти 1) |
| Devilroot | Диявольський корінь | `devilroot` | `devil → диявол` (`Chain Devil → Ланцюговий диявол`); `root → корінь` |
| Androsphinx | Андросфінкс | `androsphinx` | `Gynosphinx → Гіносфінкс` (спадковий запис), та сама транслітерація префікса |
| Sibriex | Сібрієкс | `sibriex` | **чиста транслітерація, прецеденту немає** (пор. `Nycaloth → Нікалот`) |
| Alustriel Silverhand | Алустріель Сілверхенд | `alustriel-silverhand` | `Laeral Silverhand → Лаерал Сілверхенд` (партія 27, рідна сестра тієї самої родини) |

Не в цьому списку, бо джерело знайшлося: `Aberrant Spirit → Дух аберації` (спадковий запис 2014
id 6 і 2024-двійник збігаються) і `Draconic Spirit → Дух дракона` (2024-двійник плюс заклинання
`Summon Draconic Spirit → Виклик духу дракона`).

## 2. Власні назви поза грою (місця, особи, титули)

| Англійська | Робочий варіант | Де вжито | Підстава |
|---|---|---|---|
| Silverymoon | Сілверімун | `alustriel-silverhand`: «Посох Сілверімуна» | **прецеденту немає.** Транслітерація за `Waterdeep → Ватердіп` (партія 27) і `Silverhand → Сілверхенд`. Альтернатива, яку варто зважити власнику: «Срібномісяччя» — калька, ужита в частині українських фанперекладів |
| Toril | Торіл | `alustriel-silverhand`, опис | транслітерація, однозначна |
| the Shining Lady | Осяйна Пані | `alustriel-silverhand`, опис | титул, прецеденту немає |
| the Chosen (Mystra's) | Обрана | `alustriel-silverhand`, риса «Слух Обраної» | усталений термін FR; прецеденту в репо немає |
| Arach (некромант) | Арах | `mummified-warrior`, опис | транслітерація, однозначна |
| rooter mote | кореневий паросток | `devilroot`, «Почварна лоза» | **гоумбрю-термін самого aidedd, ніде більше не трапляється.** «Паросток» — бо в тексті вони «виростають до повного розміру за 7 днів» |
| Star Spawn | Зіркове породження | `aberrant-spirit`, варіанти духа | **не вигадано:** узято з тексту заклинання `Summon Aberration` у `spells.json` («виберіть бехолдера, слаада або зіркове породження») |
| Beholderkin | Бехолдер | `aberrant-spirit`, варіанти духа | `creatureTypeTags.beholder → Бехолдер` + той самий текст заклинання |

`Mystra → Містра` і `Manes → Манес` у списку немає: обидва вже стоять у репо (опис `laeral-silverhand`
партії 27 і каталог відповідно).

## 3. Назви рис і дій, складені заново

`ratified` у брифінгу порожній, у корпусі прецеденту немає. Партія тримається цих варіантів
послідовно; якщо власник змінить котрийсь, правити доведеться лише ці два файли.

| Англійська | Робочий варіант | Слаг | З чого складено |
|---|---|---|---|
| Downhill Roller | Котіння схилом | `minor-earth-elemental` | `Rolling Charge → Наскок із котінням` (`galeb-duhr`, партія 20) |
| Inscrutable | Незбагненність | `gynosphinx`, `androsphinx` | іменникова форма, як `Amorphous → Безформність` |
| Claw Attack | Атака кігтем | обидва сфінкси, легендарна дія | `Claw → Кіготь` (86 уживань) |
| Roar (3/Day) | Рев (3 рази на день) | `androsphinx` | обмеження — з `canonicalSuffix` |
| First / Second / Third Roar | Перший / Другий / Третій рев | `androsphinx` | те саме ядро |
| Contamination | Забруднення | `sibriex` | плаский відповідник; «Скверна» свідомо не взято як заважкий |
| Squirt Bile | Бризки жовчі | `sibriex` | `Acid Spray → Кислотні бризки` (`ankheg`) |
| Spray Bile | Розбризкування жовчі | `sibriex`, легендарна дія | **джерело дає дві різні назви для однієї дії** (`Squirt` і `Spray`), тож і переклади мусили розійтися |
| Warp Creature / Warp | Спотворення істоти / Спотворення | `sibriex` | прецеденту немає |
| Ear of the Chosen | Слух Обраної | `alustriel-silverhand` | див. «Обрана» вище |
| Reproving Ray | Докірливий промінь | `alustriel-silverhand` | родина `X Ray → X промінь` (26 уживань) |
| Argent Blaze (Requires Silver Fire) | Срібний спалах (потребує Срібного вогню) | `alustriel-silverhand` | `argent` = срібний (геральдичне); **формату «(Requires X)» у корпусі ще не було** |
| Silver Fire (2/Day) | Срібний вогонь (2 рази на день) | `alustriel-silverhand` | обмеження — з `canonicalSuffix` |
| Shining Counterspell | Осяйні контрчари | `alustriel-silverhand` | `Dread Counterspell → Контрчари жаху` (`vecna-the-archlich`) |
| Staff of Silverymoon | Посох Сілверімуна | `alustriel-silverhand` | `Staff of Power → Посох сили` (каталог предметів) + «Сілверімун» вище |
| Shared Resistances | Спільний опір | `draconic-spirit` | «опір до ушкоджень» — форма з корпусу (`young-red-shadow-dragon`, `laeral-silverhand`) |
| Rend | Роздирання | `draconic-spirit` | `Soul Rend → Роздирання душ`, `Force-Empowered Rend → Роздирання силовим полем` |
| Breath Weapon | Дихальна зброя | `draconic-spirit` | `Breath Weapons → Дихальна зброя` (20 драконів) |
| Fiendish Vine / Fiendish Pollen | Почварна лоза / Почварний пилок | `devilroot` | `fiend → Почвара`; `Fiendish Spirit → Дух почвари` (партія 31) |
| Malison Type | Тип малісона | `yuan-ti-malison` | `Yuan-ti Malison → Юань-ті Малісон` (спадковий запис) |
| Shadow Stride (3/jour) | Тіньовий крок (3 рази на день) | `venerable-shadow` | `Ethereal Stride → Ефірний крок` (`nightmare`); обмеження — канонічний формат, бо `canonicalSuffix` порожній (див. дефект нижче) |
| Psychic Slam | Психічний удар | `aberrant-spirit` | `Slam → Удар` (19 уживань) |

## 4. Дефекти джерела, зафіксовані цими партіями

Тексту не вигадано в жодному з випадків.

- **`minor-earth-elemental`** — `AC 15 (natural qrmor)`: одрук самого aidedd. Прочитано як
  `natural armor`, обхід у `fields.ac`.
- **`devilroot`** — `AC 15 (natural armour)`: британське написання, словник знає лише `armor`.
  Обхід у `fields.ac`.
- **`mummified-warrior`** — `understands Commun but can't speak`: французьке `Commun` замість
  `Common`. Обхід у `fields.languages` («розуміє Загальну…»).
- **`venerable-shadow`** — риса зветься `Shadow Stride (3/jour)`: французьке `3/jour` замість
  `3/Day`, тому `buildCanonicalSuffix` мовчить і `canonicalSuffix` порожній. Записано канонічним
  форматом «(3 рази на день)».
- **`yuan-ti-malison`** — сторінка друкує **три** секції `Actions` (`For Type 1/2/3`), парсер лишає
  тільки останню, тобто набір Типу 3. Перекладено рівно те, що бачить парсер; дії Типів 1 і 2
  до каталогу не потрапляють. Список самих типів (`Type 1/2/3`) джерело друкує голими `<br>`-рядками
  після абзацу, і парсер їх губить — відновлено дослівно з сирого HTML у текст риси «Тип малісона»
  (той самий ручний обхід, що для `Martial Role` у партіях 31–32).
- **`grell`, `devilroot`** — `blindsight 60 ft. (blind beyond this radius)`: дужка лишається
  англійською, конвертер не падає. Обхід у `fields.senses` за формою партій 8 і 20.
- **`ancient-shadow`, `venerable-shadow`** — `Stealth +5 (+7 in dim light or darkness)`: конвертер
  відмовляє на всьому рядку. Обхід у `fields.skills` за формою `shadow` (партія 8).
