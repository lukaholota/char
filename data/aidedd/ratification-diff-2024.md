# Діф ратифікації назв рис — бестіарій 2024

Дата: 2026-08-22. Підстава: звірка [quality-audit-monsters-2024.md](quality-audit-monsters-2024.md) —
`dictionary.json → statblockFeatures` (119 назв) ратифікували 2026-08-19, **після** того, як
черга партій 2024 закрилася 2026-08-18, тож корпус 2024 крізь `ratify-glossary.ts` не проходив
жодного разу. Виміряно позиційним зіставленням укр./англ. назв у 491 записі:
**794 збіги, 356 уживань поза словником у 253 істот, 34 англійські назви.**

**Нічого не застосовано.** Це документ на підпис: три купи, координати, скрипт для першої купи
(написаний, перевірений на копії, у робочому дереві **не запускався**).

| Купа | Назв | Уживань | Істот | Що з нею робити |
|---|---:|---:|---:|---|
| 1. Безпечно | 24 | **160** | 137 | скрипт нижче, один прогін |
| 2. Колізія | 10 | **196** | 167 | 5 рішень власника, застосовувати парами |
| 3. Словника немає | 42 | 132 | — | вибір форми, дешевий: у 20 із 42 є явна більшість |

Купа 3 — це вже не «поза словником», а **внутрішня неузгодженість самого 2024**: та сама
англійська назва має в корпусі дві-три українські форми, а словникового запису немає взагалі,
тож вирівняти можна без жодного нового терміна — вибором однієї з наявних форм.

## Купа 1 — безпечно, 24 назви, 160 уживань, 137 істот

Критерії, за якими назва потрапила саме сюди (усі три виконано машинно):

1. `statblockFeatures` дає однозначний відповідник;
2. цільову назву в корпусі 2024 **не носить жодна інша** англійська назва — перейменування не
   створює двозначності (перевірено і в межах запису, і по всьому корпусу);
3. поточну українську форму **не згадано в прозі** жодного запису — текст не розсинхронізується
   (єдина згадка «Дотик» у `rust-monster` — звичайна проза «Дотик знищує Куб 1 фт.», не посилання
   на дію `magmin`).

| Англійська | Словник | Форми в корпусі | Істот |
|---|---|---|---:|
| Amphibious | Земноводність | «Амфібія» ×38 | 38 |
| Pack Tactics | Тактика зграї | «Зграйна тактика» ×21 | 21 |
| Fire Breath | Вогняний подих | «Вогняне дихання» ×15 | 15 |
| Flyby | Виліт без атаки нагоди | «Обліт» ×10, «Пролітання» ×1 | 11 |
| Acid Breath | Кислотний подих | «Кислотне дихання» ×8 | 8 |
| Cold Breath | Крижаний подих | «Холодне дихання» ×5, «Крижане дихання» ×2 | 7 |
| Lightning Breath | Блискавичний подих | «Дихання блискавкою» ×7 | 7 |
| Web Walker | Ходець павутиною | «Ходіння павутиною» ×5, «Павутинний хід» ×1 | 6 |
| Water Breathing | Водне дихання | «Дихання під водою» ×6 | 6 |
| Hold Breath | Затримка дихання | «Затримка подиху» ×5 | 5 |
| Magic Resistance | Магічний опір | «Опір магії» ×5 | 5 |
| Amorphous | Безформність | «Аморфність» ×4 | 4 |
| Sleep Breath | Сонний подих | «Сонне дихання» ×4 | 4 |
| Ram | Таран | «Удар рогами» ×3 | 3 |
| Standing Leap | Стрибок з місця | «Стрибучість» ×2, «Стрибок із землі» ×1 | 3 |
| Blood Frenzy | Кров'яний шал | «Кривава лють» ×3 | 3 |
| Spider Climb | Павуче лазіння | «Павукове лазіння» ×3 | 3 |
| Repulsion Breath | Відштовхувальний подих | «Відштовхувальне дихання» ×3 | 3 |
| Superior Invisibility | Досконала невидимість | «Вища невидимість» ×2 | 2 |
| Arcane Burst | Аркановий сплеск | «Магічний вибух» ×1, «Арканічний сплеск» ×1 | 2 |
| Illumination | Освітлення | «Світіння» ×1 | 1 |
| Mimicry | Мімікрія | «Імітація звуків» ×1 | 1 |
| Telepathic Shroud | Телепатичний покров | «Телепатична завіса» ×1 | 1 |
| Touch | Доторк | «Дотик» ×1 | 1 |

### Скрипт

[`apply-ratification-safe.ts`](apply-ratification-safe.ts) — 124 рядки, лежить у `data/aidedd/`
навмисно (межі сесії звірки не дозволяли писати в `scripts/`); після підпису йому місце
в `scripts/aidedd/`.

```
npx tsx data/aidedd/apply-ratification-safe.ts            # сухий прогін, нічого не пише
npx tsx data/aidedd/apply-ratification-safe.ts --apply    # запис у партії
```

- **Бере тільки 24 назви купи 1** — перелік англійських ключів зашитий у файл, решта 10 не
  зачіпається навіть якщо словник зміниться.
- **Ідемпотентний**: другий прогін після `--apply` дає `0 назв у 0 істот`.
- **Зберігає суфікс** уживання: «Вогняне дихання (Перезарядка 5–6)» → «Вогняний подих
  (Перезарядка 5–6)».
- **Зберігає форматування файлу**: партії 12–14 записані з відступом в один пробіл, решта —
  у два; відступ читається з самого файлу, інакше діф був би на 5 400 рядків замість 320.
- **Падає**, якщо правка створила б у записі дві риси з однаковою назвою або якщо стару назву
  згадано в прозі того ж запису.

Перевірено на **копії** партій у тимчасовому каталозі (робоче дерево не чіпалося):
`--apply` → 160 назв у 137 істот, діф **320 рядків, усі до одного — рядки `"name"`**;
повторний прогін → 0 змін. Дві помилки, які ця перевірка й виловила: `cutSuffix` повертає
суфікс **без дужок** (перша версія робила «Блискавичний подихПерезарядка 5–6»), і повне
пересеріалізування ламало відступ партій 12–14.

### Координати

**Amphibious → «Земноводність»** — 38 уживань

- `batch-01.json` · `crab` · `traits[0]` · «Амфібія»
- `batch-01.json` · `frog` · `traits[0]` · «Амфібія»
- `batch-02.json` · `giant-crab` · `traits[0]` · «Амфібія»
- `batch-02.json` · `merfolk-skirmisher` · `traits[0]` · «Амфібія»
- `batch-03.json` · `bullywug-warrior` · `traits[0]` · «Амфібія»
- `batch-03.json` · `giant-frog` · `traits[0]` · «Амфібія»
- `batch-03.json` · `kuo-toa` · `traits[0]` · «Амфібія»
- `batch-05.json` · `giant-toad` · `traits[0]` · «Амфібія»
- `batch-06.json` · `black-dragon-wyrmling` · `traits[0]` · «Амфібія»
- `batch-06.json` · `kuo-toa-whip` · `traits[0]` · «Амфібія»
- `batch-07.json` · `bronze-dragon-wyrmling` · `traits[0]` · «Амфібія»
- `batch-07.json` · `green-dragon-wyrmling` · `traits[0]` · «Амфібія»
- `batch-07.json` · `merrow` · `traits[0]` · «Амфібія»
- `batch-08.json` · `sea-hag` · `traits[0]` · «Амфібія»
- `batch-09.json` · `gold-dragon-wyrmling` · `traits[0]` · «Амфібія»
- `batch-09.json` · `green-hag` · `traits[0]` · «Амфібія»
- `batch-09.json` · `kuo-toa-monitor` · `traits[0]` · «Амфібія»
- `batch-10.json` · `archelon` · `traits[0]` · «Амфібія»
- `batch-10.json` · `bullywug-bog-sage` · `traits[0]` · «Амфібія»
- `batch-10.json` · `chuul` · `traits[0]` · «Амфібія»
- `batch-12.json` · `kuo-toa-archpriest` · `traits[0]` · «Амфібія»
- `batch-12.json` · `merfolk-wavebender` · `traits[0]` · «Амфібія»
- `batch-13.json` · `young-black-dragon` · `traits[0]` · «Амфібія»
- `batch-14.json` · `aboleth` · `traits[0]` · «Амфібія»
- `batch-14.json` · `young-bronze-dragon` · `traits[0]` · «Амфібія»
- `batch-14.json` · `young-green-dragon` · `traits[0]` · «Амфібія»
- `batch-15.json` · `marid` · `traits[0]` · «Амфібія»
- `batch-15.json` · `young-gold-dragon` · `traits[0]` · «Амфібія»
- `batch-16.json` · `adult-black-dragon` · `traits[0]` · «Амфібія»
- `batch-16.json` · `adult-bronze-dragon` · `traits[0]` · «Амфібія»
- `batch-16.json` · `adult-gold-dragon` · `traits[0]` · «Амфібія»
- `batch-16.json` · `adult-green-dragon` · `traits[0]` · «Амфібія»
- `batch-16.json` · `dragon-turtle` · `traits[0]` · «Амфібія»
- `batch-16.json` · `storm-giant` · `traits[0]` · «Амфібія»
- `batch-17.json` · `ancient-black-dragon` · `traits[0]` · «Амфібія»
- `batch-17.json` · `ancient-bronze-dragon` · `traits[0]` · «Амфібія»
- `batch-17.json` · `ancient-gold-dragon` · `traits[0]` · «Амфібія»
- `batch-17.json` · `ancient-green-dragon` · `traits[0]` · «Амфібія»

**Pack Tactics → «Тактика зграї»** — 21 уживань

- `batch-01.json` · `baboon` · `traits[0]` · «Зграйна тактика»
- `batch-01.json` · `hyena` · `traits[0]` · «Зграйна тактика»
- `batch-02.json` · `blood-hawk` · `traits[0]` · «Зграйна тактика»
- `batch-02.json` · `giant-rat` · `traits[0]` · «Зграйна тактика»
- `batch-02.json` · `kobold-warrior` · `traits[0]` · «Зграйна тактика»
- `batch-02.json` · `twig-blight` · `traits[0]` · «Зграйна тактика»
- `batch-02.json` · `vulture` · `traits[0]` · «Зграйна тактика»
- `batch-02.json` · `warrior-infantry` · `traits[0]` · «Зграйна тактика»
- `batch-04.json` · `hobgoblin-warrior` · `traits[0]` · «Зграйна тактика»
- `batch-04.json` · `jackalwere` · `traits[0]` · «Зграйна тактика»
- `batch-04.json` · `reef-shark` · `traits[0]` · «Зграйна тактика»
- `batch-04.json` · `winged-kobold` · `traits[0]` · «Зграйна тактика»
- `batch-04.json` · `wolf` · `traits[0]` · «Зграйна тактика»
- `batch-05.json` · `dire-wolf` · `traits[0]` · «Зграйна тактика»
- `batch-05.json` · `giant-vulture` · `traits[0]` · «Зграйна тактика»
- `batch-05.json` · `tough` · `traits[0]` · «Зграйна тактика»
- `batch-06.json` · `lion` · `traits[0]` · «Зграйна тактика»
- `batch-09.json` · `hell-hound` · `traits[0]` · «Зграйна тактика»
- `batch-09.json` · `werewolf` · `traits[0]` · «Зграйна тактика»
- `batch-09.json` · `winter-wolf` · `traits[0]` · «Зграйна тактика»
- `batch-10.json` · `tough-boss` · `traits[0]` · «Зграйна тактика»

**Fire Breath → «Вогняний подих»** — 15 уживань

- `batch-04.json` · `magma-mephit` · `actions[1]` · «Вогняне дихання (Перезарядка 6)»
- `batch-05.json` · `brass-dragon-wyrmling` · `actions[1]` · «Вогняне дихання (Перезарядка 5–6)»
- `batch-09.json` · `gold-dragon-wyrmling` · `actions[2]` · «Вогняне дихання (Перезарядка 5–6)»
- `batch-09.json` · `hell-hound` · `actions[2]` · «Вогняне дихання (Перезарядка 5–6)»
- `batch-10.json` · `red-dragon-wyrmling` · `actions[2]` · «Вогняне дихання (Перезарядка 5–6)»
- `batch-12.json` · `chimera` · `actions[4]` · «Вогняне дихання (Перезарядка 5–6)»
- `batch-12.json` · `young-brass-dragon` · `actions[2]` · «Вогняне дихання (Перезарядка 5–6)»
- `batch-15.json` · `adult-brass-dragon` · `actions[2]` · «Вогняне дихання (Перезарядка 5–6)»
- `batch-15.json` · `young-gold-dragon` · `actions[2]` · «Вогняне дихання (Перезарядка 5–6)»
- `batch-15.json` · `young-red-dragon` · `actions[2]` · «Вогняне дихання (Перезарядка 5–6)»
- `batch-16.json` · `adult-gold-dragon` · `actions[2]` · «Вогняне дихання (Перезарядка 5–6)»
- `batch-16.json` · `adult-red-dragon` · `actions[2]` · «Вогняне дихання (Перезарядка 5–6)»
- `batch-17.json` · `ancient-brass-dragon` · `actions[2]` · «Вогняне дихання (Перезарядка 5–6)»
- `batch-17.json` · `ancient-gold-dragon` · `actions[2]` · «Вогняне дихання (Перезарядка 5–6)»
- `batch-17.json` · `ancient-red-dragon` · `actions[2]` · «Вогняне дихання (Перезарядка 5–6)»

**Flyby → «Виліт без атаки нагоди»** — 11 уживань

- `batch-01.json` · `owl` · `traits[0]` · «Обліт»
- `batch-02.json` · `animated-broom` · `traits[0]` · «Обліт»
- `batch-02.json` · `flying-snake` · `traits[0]` · «Обліт»
- `batch-03.json` · `giant-owl` · `traits[0]` · «Обліт»
- `batch-03.json` · `pteranodon` · `traits[0]` · «Обліт»
- `batch-04.json` · `giant-wasp` · `traits[0]` · «Пролітання»
- `batch-06.json` · `hippogriff` · `traits[0]` · «Обліт»
- `batch-07.json` · `gargoyle` · `traits[0]` · «Обліт»
- `batch-08.json` · `peryton` · `traits[0]` · «Обліт»
- `batch-08.json` · `spined-devil` · `traits[0]` · «Обліт»
- `batch-13.json` · `cockatrice-regent` · `traits[0]` · «Обліт»

**Acid Breath → «Кислотний подих»** — 8 уживань

- `batch-05.json` · `copper-dragon-wyrmling` · `actions[1]` · «Кислотне дихання (Перезарядка 5–6)»
- `batch-06.json` · `black-dragon-wyrmling` · `actions[2]` · «Кислотне дихання (Перезарядка 5–6)»
- `batch-13.json` · `young-black-dragon` · `actions[2]` · «Кислотне дихання (Перезарядка 5–6)»
- `batch-13.json` · `young-copper-dragon` · `actions[2]` · «Кислотне дихання (Перезарядка 5–6)»
- `batch-16.json` · `adult-black-dragon` · `actions[2]` · «Кислотне дихання (Перезарядка 5–6)»
- `batch-16.json` · `adult-copper-dragon` · `actions[2]` · «Кислотне дихання (Перезарядка 5–6)»
- `batch-17.json` · `ancient-black-dragon` · `actions[2]` · «Кислотне дихання (Перезарядка 5–6)»
- `batch-17.json` · `ancient-copper-dragon` · `actions[2]` · «Кислотне дихання (Перезарядка 5–6)»

**Cold Breath → «Крижаний подих»** — 7 уживань

- `batch-12.json` · `young-white-dragon` · `actions[2]` · «Холодне дихання (Перезарядка 5–6)»
- `batch-14.json` · `abominable-yeti` · `actions[4]` · «Крижане дихання (Перезарядка 6)»
- `batch-14.json` · `young-silver-dragon` · `actions[2]` · «Крижане дихання (Перезарядка 5–6)»
- `batch-16.json` · `adult-silver-dragon` · `actions[2]` · «Холодне дихання (Перезарядка 5–6)»
- `batch-16.json` · `adult-white-dragon` · `actions[2]` · «Холодне дихання (Перезарядка 5–6)»
- `batch-17.json` · `ancient-silver-dragon` · `actions[2]` · «Холодне дихання (Перезарядка 5–6)»
- `batch-17.json` · `ancient-white-dragon` · `actions[2]` · «Холодне дихання (Перезарядка 5–6)»

**Lightning Breath → «Блискавичний подих»** — 7 уживань

- `batch-14.json` · `young-blue-dragon` · `actions[2]` · «Дихання блискавкою (Перезарядка 5–6)»
- `batch-14.json` · `young-bronze-dragon` · `actions[2]` · «Дихання блискавкою (Перезарядка 5–6)»
- `batch-15.json` · `behir` · `actions[3]` · «Дихання блискавкою (Перезарядка 5–6)»
- `batch-16.json` · `adult-blue-dragon` · `actions[2]` · «Дихання блискавкою (Перезарядка 5–6)»
- `batch-16.json` · `adult-bronze-dragon` · `actions[2]` · «Дихання блискавкою (Перезарядка 5–6)»
- `batch-17.json` · `ancient-blue-dragon` · `actions[2]` · «Дихання блискавкою (Перезарядка 5–6)»
- `batch-17.json` · `ancient-bronze-dragon` · `actions[2]` · «Дихання блискавкою (Перезарядка 5–6)»

**Web Walker → «Ходець павутиною»** — 6 уживань

- `batch-01.json` · `spider` · `traits[1]` · «Ходіння павутиною»
- `batch-05.json` · `giant-spider` · `traits[1]` · «Ходіння павутиною»
- `batch-07.json` · `ettercap` · `traits[1]` · «Павутинний хід»
- `batch-09.json` · `phase-spider` · `traits[2]` · «Ходіння павутиною»
- `batch-12.json` · `drider` · `traits[2]` · «Ходіння павутиною»
- `batch-15.json` · `yochlol` · `traits[3]` · «Ходіння павутиною»

**Water Breathing → «Водне дихання»** — 6 уживань

- `batch-04.json` · `giant-seahorse` · `traits[0]` · «Дихання під водою»
- `batch-04.json` · `reef-shark` · `traits[1]` · «Дихання під водою»
- `batch-05.json` · `giant-octopus` · `traits[0]` · «Дихання під водою»
- `batch-06.json` · `swarm-of-piranhas` · `traits[1]` · «Дихання під водою»
- `batch-11.json` · `giant-shark` · `traits[0]` · «Дихання під водою»
- `batch-12.json` · `giant-squid` · `traits[0]` · «Дихання під водою»

**Hold Breath → «Затримка дихання»** — 5 уживань

- `batch-04.json` · `crocodile` · `traits[0]` · «Затримка подиху»
- `batch-08.json` · `plesiosaurus` · `traits[0]` · «Затримка подиху»
- `batch-09.json` · `killer-whale` · `traits[0]` · «Затримка подиху»
- `batch-10.json` · `hippopotamus` · `traits[0]` · «Затримка подиху»
- `batch-14.json` · `hydra` · `traits[0]` · «Затримка подиху»

**Magic Resistance → «Магічний опір»** — 5 уживань

- `batch-11.json` · `mezzoloth` · `traits[1]` · «Опір магії»
- `batch-11.json` · `night-hag` · `traits[1]` · «Опір магії»
- `batch-11.json` · `pixie-wonderbringer` · `traits[0]` · «Опір магії»
- `batch-11.json` · `red-slaad` · `traits[0]` · «Опір магії»
- `batch-11.json` · `unicorn` · `traits[1]` · «Опір магії»

**Amorphous → «Безформність»** — 4 уживань

- `batch-04.json` · `gray-ooze` · `traits[0]` · «Аморфність»
- `batch-05.json` · `shadow` · `traits[0]` · «Аморфність»
- `batch-06.json` · `psychic-gray-ooze` · `traits[0]` · «Аморфність»
- `batch-10.json` · `black-pudding` · `traits[0]` · «Аморфність»

**Sleep Breath → «Сонний подих»** — 4 уживань

- `batch-05.json` · `brass-dragon-wyrmling` · `actions[2]` · «Сонне дихання»
- `batch-12.json` · `young-brass-dragon` · `actions[3]` · «Сонне дихання»
- `batch-15.json` · `adult-brass-dragon` · `actions[3]` · «Сонне дихання»
- `batch-17.json` · `ancient-brass-dragon` · `actions[3]` · «Сонне дихання»

**Ram → «Таран»** — 3 уживань

- `batch-01.json` · `deer` · `actions[0]` · «Удар рогами»
- `batch-01.json` · `goat` · `actions[0]` · «Удар рогами»
- `batch-03.json` · `elk` · `actions[0]` · «Удар рогами»

**Standing Leap → «Стрибок з місця»** — 3 уживань

- `batch-01.json` · `frog` · `traits[1]` · «Стрибок із землі»
- `batch-03.json` · `giant-frog` · `traits[1]` · «Стрибучість»
- `batch-05.json` · `giant-toad` · `traits[1]` · «Стрибучість»

**Blood Frenzy → «Кров'яний шал»** — 3 уживань

- `batch-05.json` · `sahuagin-warrior` · `traits[0]` · «Кривава лють»
- `batch-08.json` · `sahuagin-priest` · `traits[0]` · «Кривава лють»
- `batch-11.json` · `sahuagin-baron` · `traits[0]` · «Кривава лють»

**Spider Climb → «Павуче лазіння»** — 3 уживань

- `batch-11.json` · `roper` · `traits[0]` · «Павукове лазіння»
- `batch-11.json` · `vampire-spawn` · `traits[0]` · «Павукове лазіння»
- `batch-16.json` · `vampire` · `traits[2]` · «Павукове лазіння»

**Repulsion Breath → «Відштовхувальний подих»** — 3 уживань

- `batch-14.json` · `young-bronze-dragon` · `actions[3]` · «Відштовхувальне дихання»
- `batch-16.json` · `adult-bronze-dragon` · `actions[3]` · «Відштовхувальне дихання»
- `batch-17.json` · `ancient-bronze-dragon` · `actions[3]` · «Відштовхувальне дихання»

**Superior Invisibility → «Досконала невидимість»** — 2 уживань

- `batch-05.json` · `faerie-dragon-youth` · `bonusActions[0]` · «Вища невидимість»
- `batch-07.json` · `faerie-dragon-adult` · `bonusActions[0]` · «Вища невидимість»

**Arcane Burst → «Аркановий сплеск»** — 2 уживань

- `batch-12.json` · `mage` · `actions[1]` · «Магічний вибух»
- `batch-15.json` · `archmage` · `actions[1]` · «Арканічний сплеск»

**Illumination → «Освітлення»** — 1 уживань

- `batch-01.json` · `giant-fire-beetle` · `traits[0]` · «Світіння»

**Mimicry → «Мімікрія»** — 1 уживань

- `batch-01.json` · `raven` · `traits[0]` · «Імітація звуків»

**Telepathic Shroud → «Телепатичний покров»** — 1 уживань

- `batch-02.json` · `flumph` · `traits[2]` · «Телепатична завіса»

**Touch → «Доторк»** — 1 уживань

- `batch-04.json` · `magmin` · `actions[0]` · «Дотик»

## Купа 2 — колізії, 10 назв, 196 уживань, 167 істот

Спільна перевірка, яка стосується всіх десяти: **жодна істота не має обох назв колізійної пари
одночасно** (перевірено по всіх 521 сторінках для пар `Pounce`/`Charge`, `Talons`/`Claws`,
`Claw`/`Claws`, `Claw`/`Talons`, `Javelin`/`Spear`). Тобто дублікатів усередині одного статблоку
не виникне — колізія корпусна: читач бачить «Наскок» як `Pounce` в однієї істоти й як `Charge`
в іншої.

### 1. Spellcasting — 110 уживань, найдорожче рішення

Словник: «Чаклування». Корпус 2024: «Чаротворення» ×110, **без жодного винятку**.
Корпус 2014: «Чаклування» ×107, теж без винятків. Тобто це не дрейф, а розбіжність редакцій.

- **Колізія 1:** назву згадано в прозі **66 записів** («…може використати Чаротворення, щоб
  накласти…»). Перейменування лише в назві риси розсинхронізує текст із заголовком.
- **Колізія 2:** house style скіла `dnd-ua-translation` прямо забороняє паралельний словник
  під 2024 — тобто «лишити як є» теж потребує рішення, а не мовчання.

Виходи: (а) перейменувати і назву, і 66 прозових згадок → 2024 сходиться з 2014 і словником;
(б) змінити словниковий запис на «Чаротворення» і переписати 2014 (107 уживань) — один термін
на обидві редакції, але зачіпає готовий корпус 2014; (в) записати «Чаротворення» як свідому
2024-форму в `dictionary.json` окремим ключем — найдешевше зараз, найдорожче потім.

### 2. Claw — 36 уживань, і це те саме питання про `Giant Scorpion`

Словник: «Кіготь». Корпус: «Пазур» ×33, «Кіготь» ×8 (уже збігається), «Клішня» ×3.

- **Колізія 1:** «Клішня» стоїть у `crab`, `giant-crab`, `giant-scorpion` — механічне
  застосування дасть крабові «Кіготь». Це буквально питання партії 14 про виняток у
  `statblockFeatures`, яке досі без відповіді (журнал O12).
- **Колізія 2:** назву згадано в прозі 19 записів.

Виходи: (а) відповісти на питання про виняток і застосувати `Claw → Кіготь` з винятком для
членистоногих; (б) визнати «Пазур» формою 2024 (33 проти 8) і змінити словник;
(в) застосувати дослівно й прийняти «Кіготь» у краба.

### 3–4. Pounce + Charge — пара, яку можна лагодити тільки разом

Словник: `Pounce → «Стрибок»`, `Charge → «Наскок»`. Корпус 2024: `Pounce → «Наскок»` ×19,
`Charge → «Наступ»` ×4 — тобто **«Наскок» у 2024 означає іншу механіку, ніж у словнику**.

Виправлення однієї назви без другої створює дві різні риси з назвою «Наскок» у сусідніх
записах. Застосовані разом (23 уживання), вони колізію знімають повністю.

Виходи: (а) застосувати пару одним прогоном; (б) лишити 2024-ву пару як є і записати це
рішення, бо мовчазний статус-кво читається як помилка.

### 5–6. Talons + Claws — дзеркальний обмін

Словник: `Talons → «Пазурі»`, `Claws → «Кігті»`. Корпус: `Talons → «Кігті»` ×4,
`Claws → «Пазурі»` ×2 — назви помінялися місцями. Та сама логіка, що з `Pounce`/`Charge`:
лагодити парою (6 уживань), поодинці — не можна. Пов'язано з рішенням по `Claw` вище.

### 7. Slam — 6 уживань

Словник: «Удар». Корпус: «Ляпас» ×5, «Удар гілкою» ×1 (`awakened-tree`).

- **Колізія:** «Удар гілкою» — свідома конкретизація, механічне вирівнювання її з'їсть.
- Назву згадано в прозі 4 записів.

Виходи: застосувати з винятком для `awakened-tree`; або застосувати дослівно.

### 8. Constrict — 6 уживань

Словник: «Здушення». Корпус: «Здавлювання» ×5, «Стиснення» ×1 (`giant-constrictor-snake`).
Назву згадано в прозі 3 записів — перейменування тягне за собою правку тексту.

### 9. Swallow — 7 уживань

Словник: «Проковтування». Корпус: «Ковтання» ×7. Назву згадано в прозі 1 запису.
Найпростіший із десяти: одна прозова згадка.

### 10. Javelin — 2 уживання

Словник: `Javelin → «Метальний спис»`, і водночас `Spear → «Спис»`. Корпус 2024 назвав
`Javelin` просто «Спис» у `guard-captain` і `wereboar` — тобто зайняв назву іншої зброї.
Назву згадано в прозі обох записів. Виправляти варто разом із прозою, інакше «Спис» у тексті
й «Метальний спис» у заголовку.

### Координати купи 2

#### Spellcasting — 110 уживань, словник каже «Чаклування»

Форми в корпусі: «Чаротворення» ×110

- Колізія: назву згадано в тілі текстів: 66 записів
- Назву згадано в прозі цих записів (66): `aarakocra-aeromancer`, `aberrant-cultist`, `adult-black-dragon`, `adult-blue-dragon`, `adult-brass-dragon`, `adult-bronze-dragon`, `adult-copper-dragon`, `adult-gold-dragon`, `adult-green-dragon`, `adult-red-dragon`, `adult-silver-dragon`, `ancient-black-dragon` …

Координати:

- `batch-03.json`: `giant-owl`, `pixie`, `priest-acolyte`
- `batch-05.json`: `dryad`, `empyrean-iota`, `faerie-dragon-youth`
- `batch-06.json`: `yuan-ti-infiltrator`
- `batch-07.json`: `cultist-fanatic`, `druid`, `faerie-dragon-adult`, `githzerai-monk`, `lizardfolk-geomancer`, `mage-apprentice`
- `batch-08.json`: `githyanki-warrior`, `priest`, `sahuagin-priest`
- `batch-09.json`: `goblin-hexer`, `green-hag`, `quaggoth-thonot`, `yuan-ti-malison-type-1`, `yuan-ti-malison-type-2`
- `batch-10.json`: `aarakocra-aeromancer`, `bone-naga`, `bullywug-bog-sage`, `couatl`, `flameskull`, `incubus`, `lamia`, `yuan-ti-malison-type-3`
- `batch-11.json`: `barlgura`, `cambion`, `mezzoloth`, `night-hag`, `pixie-wonderbringer`, `unicorn`
- `batch-12.json`: `azer-pyromancer`, `bandit-deceiver`, `ghast-gravecaller`, `githzerai-zerth`, `kuo-toa-archpriest`, `mage`, `merfolk-wavebender`, `performer-maestro`
- `batch-13.json`: `aberrant-cultist`, `centaur-warden`, `death-cultist`, `elemental-cultist`, `fiend-cultist`, `githyanki-knight`, `mind-flayer`, `oni`, `yuan-ti-abomination`
- `batch-14.json`: `cloud-giant`, `cultist-hierophant`, `cyclops-oracle`, `death-slaad`, `deva`, `glabrezu`, `gray-slaad`, `green-slaad`, `guardian-naga`, `sphinx-of-secrets`, `spirit-naga`, `thri-kreen-psion`
- `batch-15.json`: `adult-brass-dragon`, `arcanaloth`, `archmage`, `archpriest`, `dao`, `death-knight-aspirant`, `djinni`, `efreeti`, `githzerai-psion`, `marid`, `mind-flayer-arcanist`, `noble-prodigy`, `performer-legend`, `questing-knight`, `sphinx-of-lore`, `yochlol`
- `batch-16.json`: `adult-black-dragon`, `adult-blue-dragon`, `adult-bronze-dragon`, `adult-copper-dragon`, `adult-gold-dragon`, `adult-green-dragon`, `adult-red-dragon`, `adult-silver-dragon`, `death-knight`, `dracolich`, `githyanki-dracomancer`, `mummy-lord`, `planetar`, `rakshasa`, `storm-giant`, `ultroloth`
- `batch-17.json`: `ancient-black-dragon`, `ancient-blue-dragon`, `ancient-brass-dragon`, `ancient-bronze-dragon`, `ancient-copper-dragon`, `ancient-gold-dragon`, `ancient-green-dragon`, `ancient-red-dragon`, `ancient-silver-dragon`, `arch-hag`, `empyrean`, `lich`, `solar`, `sphinx-of-valor`

#### Claw — 36 уживань, словник каже «Кіготь»

Форми в корпусі: «Пазур» ×33, «Клішня» ×3

- Колізія: назву згадано в тілі текстів: 19 записів
- Назву згадано в прозі цих записів (19): `brown-bear`, `chimera`, `ettercap`, `gargoyle`, `ghast-gravecaller`, `green-hag`, `intellect-devourer`, `lamia`, `medusa`, `merrow`, `nothic`, `quaggoth` …

Координати:

- `batch-01.json`: `crab`
- `batch-02.json`: `giant-crab`, `manes`, `twig-blight`
- `batch-03.json`: `needle-blight`, `smoke-mephit`
- `batch-04.json`: `dust-mephit`, `ice-mephit`, `magma-mephit`, `steam-mephit`
- `batch-05.json`: `brown-bear`, `ghoul`, `sahuagin-warrior`
- `batch-06.json`: `harpy`, `lacedon-ghoul`, `manes-vaporspawn`
- `batch-07.json`: `ettercap`, `gargoyle`, `ghast`, `intellect-devourer`, `merrow`, `nothic`
- `batch-08.json`: `giant-scorpion`, `quaggoth`, `sea-hag`
- `batch-09.json`: `green-hag`, `quaggoth-thonot`, `yeti`
- `batch-10.json`: `lamia`
- `batch-12.json`: `chimera`, `ghast-gravecaller`, `medusa`, `xorn`
- `batch-14.json`: `sphinx-of-secrets`
- `batch-17.json`: `sphinx-of-valor`, `tarrasque`

#### Pounce — 19 уживань, словник каже «Стрибок»

Форми в корпусі: «Наскок» ×19

- Колізія: поточна форма «Наскок» — словникова назва для Charge

Координати:

- `batch-15.json`: `adult-brass-dragon`
- `batch-16.json`: `adult-black-dragon`, `adult-bronze-dragon`, `adult-copper-dragon`, `adult-gold-dragon`, `adult-red-dragon`, `adult-silver-dragon`, `adult-white-dragon`, `dracolich`, `shadow-dragon`
- `batch-17.json`: `ancient-black-dragon`, `ancient-brass-dragon`, `ancient-bronze-dragon`, `ancient-copper-dragon`, `ancient-gold-dragon`, `ancient-green-dragon`, `ancient-red-dragon`, `ancient-silver-dragon`, `ancient-white-dragon`

#### Swallow — 7 уживань, словник каже «Проковтування»

Форми в корпусі: «Ковтання» ×7

- Колізія: назву згадано в тілі текстів: 1 записів
- Назву згадано в прозі цих записів (1): `kraken`

Координати:

- `batch-03.json`: `giant-frog`
- `batch-05.json`: `giant-toad`
- `batch-15.json`: `behir`, `remorhaz`
- `batch-16.json`: `purple-worm`
- `batch-17.json`: `kraken`, `tarrasque`

#### Slam — 6 уживань, словник каже «Удар»

Форми в корпусі: «Ляпас» ×5, «Удар гілкою» ×1

- Колізія: назву згадано в тілі текстів: 4 записів
- Назву згадано в прозі цих записів (4): `colossus`, `earth-elemental`, `revenant`, `water-elemental`

Координати:

- `batch-03.json`: `mud-mephit`
- `batch-06.json`: `awakened-tree`
- `batch-11.json`: `earth-elemental`, `revenant`
- `batch-12.json`: `water-elemental`
- `batch-17.json`: `colossus`

#### Constrict — 6 уживань, словник каже «Здушення»

Форми в корпусі: «Здавлювання» ×5, «Стиснення» ×1

- Колізія: назву згадано в тілі текстів: 3 записів
- Назву згадано в прозі цих записів (3): `behir`, `giant-constrictor-snake`, `salamander`

Координати:

- `batch-07.json`: `giant-constrictor-snake`
- `batch-10.json`: `couatl`, `yuan-ti-malison-type-3`
- `batch-11.json`: `salamander`
- `batch-13.json`: `yuan-ti-abomination`
- `batch-15.json`: `behir`

#### Talons — 4 уживань, словник каже «Пазурі»

Форми в корпусі: «Кігті» ×4

- Колізія: цільову назву «Пазурі» у корпусі вже носить: Claws
- Колізія: поточна форма «Кігті» — словникова назва для Claws

Координати:

- `batch-03.json`: `giant-owl`
- `batch-08.json`: `peryton`
- `batch-11.json`: `giant-axe-beak`
- `batch-15.json`: `roc`

#### Charge — 4 уживань, словник каже «Наскок»

Форми в корпусі: «Наступ» ×4

- Колізія: цільову назву «Наскок» у корпусі вже носить: Pounce

Координати:

- `batch-10.json`: `lizardfolk-sovereign`
- `batch-11.json`: `troll`
- `batch-12.json`: `xorn`
- `batch-17.json`: `goristro`

#### Claws — 2 уживань, словник каже «Кігті»

Форми в корпусі: «Пазурі» ×2

- Колізія: цільову назву «Кігті» у корпусі вже носить: Talons
- Колізія: поточна форма «Пазурі» — словникова назва для Talons

Координати:

- `batch-06.json`: `allosaurus`
- `batch-10.json`: `barbed-devil`

#### Javelin — 2 уживань, словник каже «Метальний спис»

Форми в корпусі: «Спис» ×2

- Колізія: поточна форма «Спис» — словникова назва для Spear
- Колізія: назву згадано в тілі текстів: 2 записів
- Назву згадано в прозі цих записів (2): `guard-captain`, `wereboar`

Координати:

- `batch-10.json`: `guard-captain`, `wereboar`

## Купа 3 — словника немає: внутрішня неузгодженість самого 2024

**42 англійські назви** мають у корпусі 2024 більше ніж одну українську форму й **не** мають
запису в `statblockFeatures`. Це 132 уживання. Тут не потрібен новий термін — обидві форми вже
написані, треба лише обрати одну. Разом із 23 назвами, що мають словниковий запис (купи 1 і 2),
дрейф усередині 2024 охоплює **65 базових назв**.

> Чому 65, а не 62, як показує `scan-batch.ts --glossary --edition=2024`: принтер глосарію
> групує назви **разом із суфіксом**, тож «Divine Aid (2/Day)» і «Divine Aid (3/Day)» рахуються
> як дві різні назви, а «Poison Breath» і «Poison Breath (Recharge 5–6)» — теж. Тут групування
> за базою, як у `ratify-glossary.ts`.

### 3а. Є явна більшість — 17 назв (81 уживань)

Рішення дешеве: взяти більшість, як це робить `ratify-glossary.ts`.

| Англійська | Форми (частота) | Записи меншості |
|---|---|---|
| Gore | «Буцання» ×6, «Ріг» ×2, «Бивні» ×1, «Удар рогами» ×1, «Бивень» ×1, «Удар рогом» ×1 | `gorgon`, `triceratops`, `giant-boar`, `minotaur-skeleton`, `elephant`, `brazen-gorgon` |
| Divine Aid | «Божественна допомога» ×5, «Божественна поміч» ×2 | `priest-acolyte`, `priest` |
| Undead Restoration | «Нежить-відновлення» ×4, «Відновлення нежиті» ×3 | `flameskull`, `haunting-revenant`, `death-knight` |
| Siege Monster | «Облогове чудовисько» ×5, «Облоговий монстр» ×1 | `earth-elemental` |
| Fiendish Restoration | «Почварне відновлення» ×4, «Диявольське відновлення» ×2 | `rakshasa`, `ultroloth` |
| Poison Breath | «Отруйне дихання» ×4, «Отруйний подих» ×1 | `green-dragon-wyrmling` |
| Scratch | «Дряпання» ×3, «Подряпина» ×1 | `weretiger` |
| Bloodied Fury | «Лють Закривавленого» ×3, «Лють закривавленого» ×1 | `giant-boar` |
| Paralyzing Breath | «Паралізувальне дихання» ×3, «Паралітичний подих» ×1 | `silver-dragon-wyrmling` |
| Weakening Breath | «Послаблювальне дихання» ×3, «Ослаблювальний подих» ×1 | `gold-dragon-wyrmling` |
| Guiding Light | «Спрямоване світло» ×3, «Провідне світло» ×1 | `adult-bronze-dragon` |
| Limited Amphibiousness | «Обмежена амфібійність» ×2, «Обмежена земноводність» ×1 | `sahuagin-baron` |
| Abduct | «Викрадення» ×2, «Викрадання» ×1 | `grell` |
| Tunneler | «Тунельник» ×2, «Тунелебудівник» ×1 | `ankheg` |
| Pact Blade | «Клинок пакту» ×2, «Клинок Пакту» ×1 | `cultist-fanatic` |
| Earth Glide | «Земляне ковзання» ×2, «Земляний хід» ×1 | `dao` |
| Inscrutable | «Незбагненний» ×2, «Незбагненність» ×1 | `sphinx-of-secrets` |

### 3б. Нічия — 25 назв (55 уживань)

Частота не вирішує: обидві форми по одному уживанню. Потрібен вибір.

| Англійська | Варіант A | Варіант Б |
|---|---|---|
| Coven Magic | «Магія ковена» (`sea-hag`) | «Магія шабашу» (`night-hag`) |
| Hurl Flame | «Метання полум'я» (`flaming-skeleton`) | «Кидок полум'я» (`efreeti`) |
| Eye Rays | «Очні промені» (`spectator`) | «Промені ока» (`beholder-zombie`) / «Промені очей» (`death-tyrant`) |
| Hellish Restoration | «Пекельне відродження» (`lemure`) | «Пекельне відновлення» (`swarm-of-lemures`) |
| Faerie Dust | «Феєричний пилок» (`pixie`) | «Феєрійний пил» (`pixie-wonderbringer`) |
| Steam Breath | «Парове дихання» (`steam-mephit`) | «Паровий подих» (`dragon-turtle`) |
| Corrosive Form | «Роз'їдальна форма» (`gray-ooze`) | «Їдка форма» (`black-pudding`) |
| Uncanny Dodge | «Незбагненне ухилення» (`performer`) | «Спритна втеча» (`scout-captain`) |
| Euphoria Breath | «Дихання ейфорії» (`faerie-dragon-youth`) | «Подих ейфорії» (`faerie-dragon-adult`) |
| Roar | «Рик» (`lion`) | «Рев» (`sphinx-of-valor`) |
| Reel | «Намотування» (`ettercap`) | «Змотування» (`roper`) |
| Object Slam | «Удар предмета» (`poltergeist`) | «Удар об'єкта» (`haunting-revenant`) |
| Petrifying Gaze | «Окам'янюючий погляд» (`basilisk`) | «Скам'янювальний погляд» (`medusa`) |
| 2: Paralyzing Ray | «2: Паралізуючий промінь» (`spectator`) | «2: Промінь паралічу» (`death-tyrant`) |
| Deathless Agility | «Безсмертна спритність» (`vampire-familiar`) | «Безсмертна прудкість» (`vampire-spawn`) |
| Ice Throw | «Крижаний кидок» (`yeti`) | «Кидок льоду» (`abominable-yeti`) |
| Chilling Gaze | «Морозний погляд» (`yeti`) | «Крижаний погляд» (`abominable-yeti`) |
| Poison Burst | «Отруйний вибух» (`yuan-ti-malison-type-3`) | «Отруйний розряд» (`drider`) |
| Earthen Maul | «Земляний молот» (`lizardfolk-sovereign`) | «Земляна довбня» (`dao`) |
| Charm | «Чарування» (`succubus`) | «Причарування» (`vampire`) |
| Marshal Undead | «Маршал нежиті» (`death-knight-aspirant`) | «Шикування нежиті» (`death-knight`) |
| Dread Blade | «Жаский клинок» (`death-knight-aspirant`) | «Жахливий клинок» (`death-knight`) |
| Hellfire Orb | «Пекельна куля» (`death-knight-aspirant`) | «Сфера пекельного вогню» (`death-knight`) |
| Sickening Ray | «Нудотний промінь» (`vampire-umbral-lord`) | «Хворобливий промінь» (`dracolich`) |
| Tail Swipe | «Удар хвостом» (`adult-blue-dragon`) | «Змах хвоста» (`ancient-blue-dragon`) |

### 3в. Терміни, яких немає ніде — окремим файлом

Божества `Erythnul` / `Takhisis` / `Vaprak` (по дві форми), `Hadar`, `Gehenna`, три суто-2024
заклинання (`Elementalism`, `Befuddlement`, `Jallarzi's Storm of Radiance`) — усе в
[unknown-terms-bestiary-2024.md](unknown-terms-bestiary-2024.md). Вони не назви рис, тож у купи
1–3 не входять, але рішення потрібне тим самим заходом.

## Поза купами: «Кінцівка тролля» — дефект, який уже бачить користувач

Це єдиний з усіх знайдених дефектів, що **вийшов за межі партій**: помилкове «тролля» стоїть
у полі `name` запису `troll-limb` (партія 5) і вже потрапило до `src/lib/generated/creatures2024.json`
як публічна назва каталогу.

| Де | Зараз | Має бути |
|---|---|---|
| `batch-05.json` · `troll-limb` · `name` | Кінцівка **тролля** | Кінцівка **троля** |
| `batch-05.json` · `troll-limb` · `traits[0].name` | Породження **тролля** | Породження **троля** |
| `batch-05.json` · `troll-limb` · `traits[0].text` | «перетворюється на **Тролля**» | «перетворюється на **Троля**» |

Підстава: запис `troll` (партія 11) уживає «троля» ×5, назва каталогу — «Троль».
Скриптом купи 1 це **не** робиться: правка змінює публічну назву запису, тож іде разом
із перезбіркою каталогу, а не окремо. Виправлення в партії без `generate:content` дасть
розбіжність файлу з каталогом.

## Чого в цьому діфі свідомо немає

- **`Ряткидок` / `Рятівний кидок`.** Словник каже «Ряткидок», обидва бестіарії вживають
  «Рятівний кидок» (2014: 765, 2024: 415) і жодного «Ряткидка». Це не дрейф 2024 — це
  розбіжність бестіаріїв зі словником і з каталогом предметів. Окреме рішення.
- **Стиль кубика** «к4» проти «1к4» (22 проти 399 уживань).
- **Прозові терміни** поза назвами рис — вони не проходять через `statblockFeatures` взагалі.
