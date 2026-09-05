# Промпти: плитки «Раси» й «Класи» + арт довідника правил

Дві окремі задачі в одному файлі, бо обидві — про дублікати.

---

# Частина 1. Плитки головної: «Раси» й «Класи»

## Чому вони схожі — це не смак, а формат

**Виміряно 2026-09-01.** Плитки категорій на головній — вертикальні **3:4**, і одинадцять із
тринадцяти файлів так і лежать: `1200×1600`. А `races.webp` і `classes.webp` — **`1672×941`,
тобто 16:9**. Їх утискає в 3:4-слот, лишається вузька середня смуга, і від обох сцен на плитці
видно те саме: тьмяна синьо-золота готична зала з дрібними фігурами. Побайтово файли різні —
тому й не ловилося як дублікат.

**Друга причина — сюжет.** Сусіди по ряду читаються з одного погляду: у «Предметів» пляшки й
меч, у «Бестіарія» дві морди, у «Зброї» ковадло. А «Раси» й «Класи» — це масовки в інтер'єрі,
тобто найгірше, що можна дати плитці розміром із долоню.

**База — та сама темна кінематографічна, що в решти каталогів, дослівно.** Перша спроба
(2026-09-02) пішла на окремій «книжковій» базі — тепле світло, мальовані мазки — і власник
зарубав результат: вийшла мальована листівка, а не кадр. Цей абзац не міняти й не
«пом'якшувати»: набір тримається на тому, що він один на всі каталоги.

**Змінено рівно один абзац — композиція**: 3:4 замість 16:9 і вимога одного великого об'єкта
в кадрі. Це не про стиль, а про те, що плитка завбільшки з долоню.

## `public/images/categories/races.webp` — Раси / Види

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: vertical 3:4 portrait, 1200x1600 — a small catalogue tile, so it has to read at thumbnail size. ONE dominant subject fills the upper two thirds of the frame, close to the camera and understandable in a single glance; no crowd scenes, no wide architectural interiors, no small figures standing in a big hall. The bottom third is deliberately quiet and dark — floor, stone, shadow or fog — because a dark gradient and the section title are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no legible writing, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a tight vertical group of five heads and shoulders of five different peoples, packed close and stacked so each rises above the one in front: a horned dragonborn with wet scale at the top, below it a sharp-eared elf, then a broad dwarf with iron rings in his beard, then a small halfling, and a curl-horned tiefling closing the group at the base. Photoreal skin, scale, hair and horn, every pore and scratch visible. One hard torch to the left rakes across all five faces and leaves the far side of each in blackness; none of them look at the camera. Behind them only smoke and unlit stone. Accent colour: cold torch amber.
```

## `public/images/categories/classes.webp` — Класи

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: vertical 3:4 portrait, 1200x1600 — a small catalogue tile, so it has to read at thumbnail size. ONE dominant subject fills the upper two thirds of the frame, close to the camera and understandable in a single glance; no crowd scenes, no wide architectural interiors, no small figures standing in a big hall. The bottom third is deliberately quiet and dark — floor, stone, shadow or fog — because a dark gradient and the section title are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no legible writing, no logos, no watermarks, no borders or frames drawn into the image.

Subject: the tools of thirteen trades driven point-down into a cracked stone floor and shot from low and close so they tower into the frame: a greatsword at the centre, a gnarled staff with a dim crystal head, a warhammer, a longbow, a lute leaned against the blade, a holy symbol hanging from the crossguard on its chain, an unrolled thieves' tool wrap and a heavy wrench at the base. Photoreal steel with hammer marks and pitting, worn leather grips, dulled brass, real wood grain. A single low light behind the group throws long shadows toward the camera and edges every silhouette. No people, no room. Accent colour: ember gold.
```

**Приймати тільки `1200×1600`.** Файл іншого відношення повернеться на ту саму вузьку смугу,
і робота піде намарно.

---

# Частина 2. Довідник правил — сім своїх картинок

## Що виміряно

У `RULE_CATEGORIES` ([`src/lib/rulesData.ts`](../../src/lib/rulesData.ts)) сім розділів, і
**жоден не має власного арту** — усі сім позичають плитки з `categories/`:

| Розділ | Що показує зараз | Проблема |
|---|---|---|
| Бій | `combat_maneuvers_and_astral_runes` | загальна сцена |
| Магія та Чарування | `ancient_rules_tome` | загальна сцена |
| Характеристики | `adventurer_study` | загальна сцена |
| **Стани** | `draconic_guardian_and_celestial_beast` | **картинка бестіарію** — інший каталог, інша тема |
| **Пригоди та Відпочинок** | `races.webp` | **та сама картинка, що плитка «Раси» на головній** |
| Спорядження | `grand_forge_and_armory` | загальна сцена |
| Правила Майстра | `occult_alchemy_workbench` | загальна сцена |

Два останні рядки — пряме порушення `.agent/rules/visual-assets.md`: одна картинка на дві
різні сутності.

**Куди класти:** `public/images/rules/<key>.webp`, де `key` — це `RuleCategoryKey`
(`combat`, `spellcasting`, `abilities`, `conditions`, `adventuring`, `equipment`,
`gamemaster`). Тоді вшивання — це заміна семи рядків `imageSrc` і один новий префікс
`/images/rules/` → `ai` у [`asset-provenance.ts`](../../src/lib/assets/asset-provenance.ts).

**Формат — 16:9, `1672×941`**, як картки каталогу.

**База — темна, та сама, що в походжень**, бо це той самий тип картки. Змінено рівно один
абзац: композиція дозволяє сцену й предмети замість людини, бо правило — не персонаж.

## `public/images/rules/combat.webp` — Бій [Combat]

**Що не так зараз:** бере кадр із `combat_maneuvers_and_astral_runes.webp` — там просто воїн на колінах, про бій як систему нічого.

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. The subject is a scene or an arrangement of objects, not a portrait — a person may appear, but cropped, turned away or as a silhouette, never posing for the camera. It sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table, ground fog — because a dark gradient, a heading and two lines of caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no numbers on dice faces, no legible writing on books or scrolls, no logos, no watermarks, no borders or frames drawn into the image.

Subject: the exact instant of a blow landing on a raised shield: the shield fills the left of the frame at a low angle, its boards splintering, sparks and a spray of rain thrown off the rim, the attacker only a dark shape and an axe-head behind it. The right of the frame is the rest of the melee going on out of focus — two more pairs of fighters, a dropped spear, churned ground. Accent colour: ember orange.
```

## `public/images/rules/spellcasting.webp` — Магія та Чарування [Spellcasting]

**Що не так зараз:** бере `ancient_rules_tome.webp` — гримуар на столі; правило ж про слоти, компоненти й концентрацію.

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. The subject is a scene or an arrangement of objects, not a portrait — a person may appear, but cropped, turned away or as a silhouette, never posing for the camera. It sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table, ground fog — because a dark gradient, a heading and two lines of caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no numbers on dice faces, no legible writing on books or scrolls, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a casting circle being closed on flagstones: a hand in the lower left drawing the final chalk stroke, and the whole ring lighting up along its length as it completes, throwing hard light upward. Around the circle lie the material components of the work — a pinch of powder on a cloth, a stoppered vial, a bead of glass, a sprig of dried herb. No caster's face, no book. Accent colour: arcane violet.
```

## `public/images/rules/abilities.webp` — Характеристики та Правила [Abilities & Rules]

**Що не так зараз:** бере `adventurer_study.webp` — кабінет; розділ насправді про кидки, перевірки й майстерність.

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. The subject is a scene or an arrangement of objects, not a portrait — a person may appear, but cropped, turned away or as a silhouette, never posing for the camera. It sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table, ground fog — because a dark gradient, a heading and two lines of caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no numbers on dice faces, no legible writing on books or scrolls, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a scarred oak table shot close: a leather dice cup just lifted, dice still tumbling and one already come to rest, beside a brass balance, a folding measuring rod and a worn set of calipers. Blank dice faces — no pips that read as numbers. A single lamp above throws one hard pool of light onto the table and leaves the room behind it dark. Accent colour: warm brass.
```

## `public/images/rules/conditions.webp` — Стани [Conditions]

**Що не так зараз:** зараз тут дракон і небесний звір із бестіарію — тобто картинка з іншого каталогу і зовсім про інше.

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. The subject is a scene or an arrangement of objects, not a portrait — a person may appear, but cropped, turned away or as a silhouette, never posing for the camera. It sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table, ground fog — because a dark gradient, a heading and two lines of caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no numbers on dice faces, no legible writing on books or scrolls, no logos, no watermarks, no borders or frames drawn into the image.

Subject: one figure carrying several afflictions at once, seen mid-stumble against a bare wall: a band of living shadow across the eyes, a crust of frost climbing one forearm and locking the hand, a thin green haze leaking from the mouth, and a slow ring of dull light turning around the head. The body language is the subject — off balance, one knee giving. The room behind is empty and unlit. Accent colour: sickly green.
```

## `public/images/rules/adventuring.webp` — Пригоди та Відпочинок [Adventuring & Rest]

**Що не так зараз:** зараз тут `races.webp` — буквально та сама картинка, що на плитці «Раси» на головній.

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. The subject is a scene or an arrangement of objects, not a portrait — a person may appear, but cropped, turned away or as a silhouette, never posing for the camera. It sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table, ground fog — because a dark gradient, a heading and two lines of caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no numbers on dice faces, no legible writing on books or scrolls, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a night camp beside a road: a low fire in a ring of stones with a pot hung over it, a bedroll half unrolled, boots and a pack set down, a cloak drying on a stick. The fire is the only light. Further right, at the edge of it, the back of the sentry standing watch over a dark valley, and the road going on into it. Accent colour: campfire amber.
```

## `public/images/rules/equipment.webp` — Спорядження [Equipment]

**Що не так зараз:** бере `grand_forge_and_armory.webp` — кузня; розділ про те, що адвенчурист несе на собі.

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. The subject is a scene or an arrangement of objects, not a portrait — a person may appear, but cropped, turned away or as a silhouette, never posing for the camera. It sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table, ground fog — because a dark gradient, a heading and two lines of caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no numbers on dice faces, no legible writing on books or scrolls, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a full pack emptied out and laid in order on a canvas sheet: coiled rope, iron pitons and a hammer, a hooded lantern, oil flask, waterskin, wrapped rations, a bedroll, a mail shirt folded flat with gauntlets on top, a whetstone and a coin pouch. Shot from just above, everything sharp and countable, the lantern lit and doing the lighting. Accent colour: lantern gold.
```

## `public/images/rules/gamemaster.webp` — Правила Майстра [Gamemaster Rules]

**Що не так зараз:** бере `occult_alchemy_workbench.webp` — алхімія; розділ про пастки, отрути, хвороби й керування столом.

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. The subject is a scene or an arrangement of objects, not a portrait — a person may appear, but cropped, turned away or as a silhouette, never posing for the camera. It sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table, ground fog — because a dark gradient, a heading and two lines of caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no numbers on dice faces, no legible writing on books or scrolls, no logos, no watermarks, no borders or frames drawn into the image.

Subject: the machinery behind a dungeon, exposed: a flagstone lifted aside to show the trap under it — a tensioned spring, a trip plate, a row of darts in their channel — with a stoppered poison vial and a bone key set down beside the opening on the floor. A gloved hand at the very edge of frame has just lifted the stone. Corridor darkness beyond. Accent colour: cold green.
```

---

**Усього: 2 плитки 3:4 + 7 картинки 16:9.**

---

# Частина 3. Нова обкладинка «Заклинань» (режим зі ШІ)

Наявна `public/images/home/spells.webp` — руки, складені дашком, і блискавка між ними. Власник,
2026-09-02: картинка застаріла, моделі з того часу стали сильніші. Це заміна **тільки для
звичайного режиму** — у режимі без ШІ картка тепер бере ілюстрацію з мануалу
(`/images/manual/spells.webp`), і її міняти не треба.

## Розмір — 2:3, а не 1:1

**Виміряно 2026-09-02.** `HOME_HERO_RATIO = 2 / 3`
([`homeTokens.ts:2`](../../src/components/home/homeTokens.ts#L2)), а обидві наявні обкладинки
героїв лежать квадратами `1600×1600` і малюються через `object-cover`. Тобто від квадрата на
екрані живе лише центральна смуга в ⅔ ширини — **по 17% з кожного боку зрізається завжди**.
Нову обкладинку робимо одразу `1200×1800`, і тоді нічого не втрачається.

## Промпт

База — та сама, що в обкладинок героїв цього файлу; змінено абзац композиції (2:3 замість 1:1)
і сюжет.

```
Dark high-fantasy cover art, cinematic photoreal render. Near-black background, heavy chiaroscuro, a single dominant light source carving the subject out of darkness. Ornate late-gothic and baroque craftsmanship — engraved metal, filigree, aged patina, worn stone, weathered leather and parchment. Desaturated brown-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust motes and floating embers, shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on every surface, wet specular highlights on metal and stone. Sombre, reverent, weighty mood — no comedy, no bright daylight, no pastel colours.

Composition: vertical 2:3 portrait, 1200x1800 — this is a tall hero card, so author it tall; do not deliver a square and let it be cropped. The subject occupies the middle band of the frame and reads from across a room; the bottom third stays quiet and dark — floor, table, fog — because a dark gradient and the section title sit over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no runic writing that resembles legible script, no logos, no watermarks, no borders or frames drawn into the image.

Subject: the instant a spell takes shape. A caster seen from behind and slightly below, hood down, one arm drawn back and the other thrust forward with the fingers splayed, so the face is barely there and the hands are everything. Between the outstretched fingers a construct of pure light is assembling itself out of nothing — nested rings, a lattice of thin geometric lines, abstract glyph shapes locking into place in mid-air, brightest at the core and throwing hard light back onto the caster's sleeve, jaw and shoulder. The material components are burning away in the air around it: a pinch of powder catching, a thread of smoke, a bead of glass flaring out. Behind the caster a vaulted stone hall recedes into darkness, its far end lit only by what is happening in those hands. Accent colour: electric cyan-violet.
```

**Чому такий сюжет.** Стара картинка показує *жест* — руки й розряд. Нова показує *момент, коли
заклинання збирається*: конструкція зі світла, що складається між пальцями, і компоненти, які
згоряють поруч. Це те, чим у правилах є накладання — жест, слово й матеріал разом, — і воно не
повторює ні кадр із довідника правил («Магія та Чарування» — коло на плитах), ні картку
«Персонажі».

