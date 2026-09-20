# Промпти на обкладинки головної — KR13.7

Мета — **один стиль на всі 13 картинок**. Скарга власника була саме про це: наявні
згенеровані вроздріб, і в теці `categories/` реально живуть три різні стилі
(фотореалістичний рендер, мальована концепт-арт, глянцевий VFX-рендер істот).

Тому нижче спільна стилістична основа винесена в **два абзаци, які в кожному промпті
повторюються дослівно**. Змінюється тільки останній абзац — сюжет і акцентний колір.
Не переписуй базу «своїми словами» під окрему картинку: тоді набір знову розповзеться.

**Плитки «Раси» й «Класи» та довідник правил — окремий файл:**
[image-prompts-home-tiles-and-rules.md](image-prompts-home-tiles-and-rules.md). Дві плитки лежать
у 16:9 замість 3:4 і тому зливаються; сім розділів правил не мають власного арту взагалі.

**Походження — окремий файл.** Їх арт іде у стилі рас і класів (16:9, кінематографічна
сцена), а не в стилі цього набору: [image-prompts-backgrounds.md](image-prompts-backgrounds.md).

## Звідки взято стиль

Описано з наявних файлів, а не вигадано. Спільний знаменник більшості
(`ancient_rules_tome`, `grand_forge_and_armory`, `adventurer_study`,
`magic_items_still_life`, `occult_alchemy_workbench`, `combat_maneuvers_and_astral_runes`,
`classes/fighter`, `classes/artificer`):

- майже чорне тло, різка світлотінь, одне домінантне джерело світла;
- фотореалістичний кінематографічний рендер, а не мазок пензля;
- пізня готика й бароко в архітектурі та металі: філігрань, гравіювання, патина;
- знебарвлена коричнево-чорна база + **рівно один** насичений акцент;
- об'ємні промені, пилинки й іскри в повітрі, мала глибина різкості, темна віньєтка;
- щільна мікродеталізація, мокрі відблиски на металі й камені.

Два файли з набору випадають зі стилю (`ancestral_species_hall`, `heroes_war_table` —
мальована концепт-арт у синьо-золотому) і `home-characters.webp` (вільний фіолетовий
живопис). Промпти на заміну перших двох — `races.webp` і `classes.webp` — нижче.

**Виміряно 2026-08-28:** `feats.webp` — це кроп тієї самої сцени з воєнним столом, що й
`heroes_war_table.webp` (класи), тож на головній дві картки виглядали однаково. Промпт на
нову `feats.webp` теж нижче.

## Акцентні кольори по набору

Щоб 13 карток не злилися в одну бурштинову стіну, акцент розписаний наперед.
Він же збігається з токенами `HOME_ACCENTS` у `src/components/home/homeTokens.ts`.

| Картка | Акцент |
|---|---|
| characters (велика) | фіолетовий |
| spells (велика + плитка) | електричний синьо-фіолетовий |
| magic-items | бірюзово-блакитний |
| bestiary | холодний біло-блакитний |
| weapons | вогняний помаранчевий |
| armor | холодна сталева синь |
| feats | золото |
| backgrounds | свічковий бурштин |
| invocations | фіолетовий |
| metamagic | пурпурово-малиновий (токен плитки — `arcaneViolet`) |
| rules | золото |
| infusions | латунь + бірюзова іскра |
| bastions | золото вогнища в бійницях |
| races | холодна бірюза |
| classes | ембер-золото |
| homebrew | моторошна біолюмінесцентна бірюза (токен `runicCyan`) |

**«Дії» окремою карткою не буде** — рішення власника 2026-08-28: дії живуть усередині
довідника правил, тож ні маршрут, ні обкладинка їм не потрібні. `actions.webp` видалено.

## Спільний негативний промпт

Для генераторів, що приймають окреме поле. Для тих, що не приймають, заборони вже
вшиті в другий абзац кожного промпту.

```
text, letters, numerals, legible script, calligraphy, logo, watermark, signature,
caption, UI, decorative border, picture frame, bright daylight, pastel colors,
flat lighting, cartoon, anime, cel shading, low detail, empty flat background,
subject cropped at the frame edge, busy detail in the bottom third
```

---

# Великі картки — 1:1

## `public/images/home/characters.webp`

```
Dark high-fantasy cover art, cinematic photoreal render. Near-black background, heavy chiaroscuro, a single dominant light source carving the subject out of darkness. Ornate late-gothic and baroque craftsmanship — engraved metal, filigree, aged patina, worn stone, weathered leather and parchment. Desaturated brown-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust motes and floating embers, shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on every surface, wet specular highlights on metal and stone. Sombre, reverent, weighty mood — no comedy, no bright daylight, no pastel colours.

Composition: square 1:1 aspect ratio, 1600x1600. The subject sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table surface, shadow or fog — so a caption bar and a dark gradient can be laid over it without covering anything important. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no runic writing that resembles legible script, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a party of four adventurers standing together at the mouth of a ruined underground hall, seen from slightly behind and to the side so their silhouettes read as a group rather than as portraits. A robed spellcaster at the centre raises a gnarled staff whose crystal head is the only light source, throwing the armoured fighter, the cloaked rogue and the bearded dwarf into rim-lit silhouette. Accent colour: deep arcane violet.
```

## `public/images/home/spells.webp`

```
Dark high-fantasy cover art, cinematic photoreal render. Near-black background, heavy chiaroscuro, a single dominant light source carving the subject out of darkness. Ornate late-gothic and baroque craftsmanship — engraved metal, filigree, aged patina, worn stone, weathered leather and parchment. Desaturated brown-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust motes and floating embers, shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on every surface, wet specular highlights on metal and stone. Sombre, reverent, weighty mood — no comedy, no bright daylight, no pastel colours.

Composition: square 1:1 aspect ratio, 1600x1600. The subject sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table surface, shadow or fog — so a caption bar and a dark gradient can be laid over it without covering anything important. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no runic writing that resembles legible script, no logos, no watermarks, no borders or frames drawn into the image.

Subject: the weathered hands of an old spellcaster raised in a steepled casting gesture inside a vaulted stone crypt, heavy silver rings on the fingers. Two concentric sigil discs of pure light hang in the air on either side of the hands, and a jagged bolt of energy climbs vertically from between the fingertips toward the vault above. Sparks and abstract glyph shapes float around the gesture; the caster's face stays out of frame. Accent colour: electric blue-violet.
```

---

# Категорії — 3:4

## `public/images/categories/spells.webp` — Заклинання

```
Dark high-fantasy cover art, cinematic photoreal render. Near-black background, heavy chiaroscuro, a single dominant light source carving the subject out of darkness. Ornate late-gothic and baroque craftsmanship — engraved metal, filigree, aged patina, worn stone, weathered leather and parchment. Desaturated brown-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust motes and floating embers, shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on every surface, wet specular highlights on metal and stone. Sombre, reverent, weighty mood — no comedy, no bright daylight, no pastel colours.

Composition: vertical 3:4 portrait aspect ratio, 1200x1600. The subject sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table surface, shadow or fog — so a caption bar and a dark gradient can be laid over it without covering anything important. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no runic writing that resembles legible script, no logos, no watermarks, no borders or frames drawn into the image.

Subject: an open spellbook floating unsupported above a low stone altar, its pages fanned by an unfelt wind. A column of light rises from the spread pages toward the top of the frame, carrying a spiral of abstract glowing glyph shapes and two thin sigil rings with it. The altar and the caster's discarded gloves lie in shadow at the base. Accent colour: electric blue-violet.
```

## `public/images/categories/magic-items.webp` — Предмети

```
Dark high-fantasy cover art, cinematic photoreal render. Near-black background, heavy chiaroscuro, a single dominant light source carving the subject out of darkness. Ornate late-gothic and baroque craftsmanship — engraved metal, filigree, aged patina, worn stone, weathered leather and parchment. Desaturated brown-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust motes and floating embers, shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on every surface, wet specular highlights on metal and stone. Sombre, reverent, weighty mood — no comedy, no bright daylight, no pastel colours.

Composition: vertical 3:4 portrait aspect ratio, 1200x1600. The subject sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table surface, shadow or fog — so a caption bar and a dark gradient can be laid over it without covering anything important. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no runic writing that resembles legible script, no logos, no watermarks, no borders or frames drawn into the image.

Subject: an enchanted longsword standing point-down in a dark oak table, its etched blade glowing along the fuller. Behind and above it, a shelf of stoppered glass vessels holds luminous liquids; a horned helm and a coiled amulet chain sit in the shadow beside it. A scatter of gem-set rings glints on the wet tabletop. Accent colour: teal-cyan.
```

## `public/images/categories/bestiary.webp` — Бестіарій

```
Dark high-fantasy cover art, cinematic photoreal render. Near-black background, heavy chiaroscuro, a single dominant light source carving the subject out of darkness. Ornate late-gothic and baroque craftsmanship — engraved metal, filigree, aged patina, worn stone, weathered leather and parchment. Desaturated brown-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust motes and floating embers, shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on every surface, wet specular highlights on metal and stone. Sombre, reverent, weighty mood — no comedy, no bright daylight, no pastel colours.

Composition: vertical 3:4 portrait aspect ratio, 1200x1600. The subject sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table surface, shadow or fog — so a caption bar and a dark gradient can be laid over it without covering anything important. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no runic writing that resembles legible script, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a horned draconic head rearing out of fog-filled forest ruins, scaled and wet, one slit eye catching the light — and beneath it, closer to the viewer, the maned head of a luminous beast half made of light. Two creatures stacked vertically, both cropped at the chest so the frame reads as heads and shoulders. Broken moss-covered masonry and drifting mist fill the lower quarter. Accent colour: cold blue-white.
```

## `public/images/categories/weapons.webp` — Зброя

```
Dark high-fantasy cover art, cinematic photoreal render. Near-black background, heavy chiaroscuro, a single dominant light source carving the subject out of darkness. Ornate late-gothic and baroque craftsmanship — engraved metal, filigree, aged patina, worn stone, weathered leather and parchment. Desaturated brown-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust motes and floating embers, shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on every surface, wet specular highlights on metal and stone. Sombre, reverent, weighty mood — no comedy, no bright daylight, no pastel colours.

Composition: vertical 3:4 portrait aspect ratio, 1200x1600. The subject sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table surface, shadow or fog — so a caption bar and a dark gradient can be laid over it without covering anything important. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no runic writing that resembles legible script, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a smith's anvil in a vaulted forge hall, a white-hot blade blank lying across it and throwing the only light. Behind the anvil, tall wooden racks hold longswords, a glaive, war axes and a spear, their edges catching thin highlights out of the darkness. Hammer and tongs rest on the soot-black floor. Accent colour: ember orange.
```

## `public/images/categories/armor.webp` — Обладунки

```
Dark high-fantasy cover art, cinematic photoreal render. Near-black background, heavy chiaroscuro, a single dominant light source carving the subject out of darkness. Ornate late-gothic and baroque craftsmanship — engraved metal, filigree, aged patina, worn stone, weathered leather and parchment. Desaturated brown-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust motes and floating embers, shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on every surface, wet specular highlights on metal and stone. Sombre, reverent, weighty mood — no comedy, no bright daylight, no pastel colours.

Composition: vertical 3:4 portrait aspect ratio, 1200x1600. The subject sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table surface, shadow or fog — so a caption bar and a dark gradient can be laid over it without covering anything important. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no runic writing that resembles legible script, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a complete suit of engraved plate armour standing empty on a wooden armourer's stand in a dark vaulted hall, helm visor down, a heater shield leaning against its greave and a mail hauberk hanging behind it. Cold light from a high slit window rakes across the pauldrons and breastplate; a single small lantern on the floor adds one warm point of contrast. Accent colour: cold steel blue.
```

## `public/images/categories/feats.webp` — Риси

```
Dark high-fantasy cover art, cinematic photoreal render. Near-black background, heavy chiaroscuro, a single dominant light source carving the subject out of darkness. Ornate late-gothic and baroque craftsmanship — engraved metal, filigree, aged patina, worn stone, weathered leather and parchment. Desaturated brown-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust motes and floating embers, shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on every surface, wet specular highlights on metal and stone. Sombre, reverent, weighty mood — no comedy, no bright daylight, no pastel colours.

Composition: vertical 3:4 portrait aspect ratio, 1200x1600. The subject sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table surface, shadow or fog — so a caption bar and a dark gradient can be laid over it without covering anything important. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no runic writing that resembles legible script, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a scarred veteran in worn leather and partial plate, alone on a stone training terrace, caught at the top of a practised sword form. The arc his blade has just travelled hangs behind him as a clean trail of light, and two fainter afterimages of the same motion echo it — mastery made visible. Sand and chipped practice posts fill the shadowed lower quarter. Accent colour: gold.
```

## `public/images/categories/backgrounds.webp` — Походження

```
Dark high-fantasy cover art, cinematic photoreal render. Near-black background, heavy chiaroscuro, a single dominant light source carving the subject out of darkness. Ornate late-gothic and baroque craftsmanship — engraved metal, filigree, aged patina, worn stone, weathered leather and parchment. Desaturated brown-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust motes and floating embers, shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on every surface, wet specular highlights on metal and stone. Sombre, reverent, weighty mood — no comedy, no bright daylight, no pastel colours.

Composition: vertical 3:4 portrait aspect ratio, 1200x1600. The subject sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table surface, shadow or fog — so a caption bar and a dark gradient can be laid over it without covering anything important. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no runic writing that resembles legible script, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a heavy oak desk lit by one horn lantern, carrying the leftovers of several past lives laid out side by side — a soldier's dented campaign medal, a priest's tarnished holy symbol on a broken chain, a set of thieves' picks in an oiled roll, a merchant's signet pressed into a blob of red wax, a folded blank travel permit and a worn leather satchel. An unmarked map with no readable place names is spread beneath them. Accent colour: candle amber.
```

## `public/images/categories/invocations.webp` — Потойбічні виклики

```
Dark high-fantasy cover art, cinematic photoreal render. Near-black background, heavy chiaroscuro, a single dominant light source carving the subject out of darkness. Ornate late-gothic and baroque craftsmanship — engraved metal, filigree, aged patina, worn stone, weathered leather and parchment. Desaturated brown-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust motes and floating embers, shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on every surface, wet specular highlights on metal and stone. Sombre, reverent, weighty mood — no comedy, no bright daylight, no pastel colours.

Composition: vertical 3:4 portrait aspect ratio, 1200x1600. The subject sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table surface, shadow or fog — so a caption bar and a dark gradient can be laid over it without covering anything important. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no runic writing that resembles legible script, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a tall oval black mirror in a blackened silver frame, standing in a cramped stone alcove. Its surface is not a reflection but churning smoke, and a long clawed hand is pressing through from the far side, fingertips already out of the glass. Abstract glowing marks — shapes, not writing — crawl around the frame's rim. A closed grimoire and a guttered candle sit on the shelf below, in shadow. Accent colour: deep violet.
```

## `public/images/categories/metamagic.webp` — Метамагія  *(O35)*

Без книги, посоха й дзеркала — ці три вже несуть «Заклинання» і «Потойбічні виклики». Метамагія
чародія — вроджена сила, яку гнуть голою рукою: одне заклинання розщеплюється надвоє.

```
Dark high-fantasy cover art, cinematic photoreal render. Near-black background, heavy chiaroscuro, a single dominant light source carving the subject out of darkness. Ornate late-gothic and baroque craftsmanship — engraved metal, filigree, aged patina, worn stone, weathered leather and parchment. Desaturated brown-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust motes and floating embers, shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on every surface, wet specular highlights on metal and stone. Sombre, reverent, weighty mood — no comedy, no bright daylight, no pastel colours.

Composition: vertical 3:4 portrait aspect ratio, 1200x1600. The subject sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table surface, shadow or fog — so a caption bar and a dark gradient can be laid over it without covering anything important. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no runic writing that resembles legible script, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a sorcerer's bare forearm and hand raised into the frame from below in a dark stone chamber, no book, no staff, no wand — the magic comes from the body itself: faint light glows through the veins of the wrist and faint scale-like marks shimmer on the skin. Between the long fingers a single stream of raw energy is being twisted like a ribbon of molten glass: it bends in a tight loop around the knuckles and then splits cleanly into two identical bolts that race upward side by side toward the top of the frame. Sparks shed from the fold point; a heavy engraved silver bracer on the wrist catches the glow. The sorcerer's face stays out of frame. Accent colour: deep magenta-crimson.
```

## `public/images/categories/homebrew.webp` — Хоумбрю спільноти  *(KR31.17)*

Вигадане гравцями, а не книгою: звичайна корчмова річ, з якої лізе те, чого там бути не повинно.
Кухоль пива зі щупальцем — ідея власника 2026-09-15. Гумор тримає сам сюжет, світло й тон
лишаються серйозними, як у решти набору.

```
Dark high-fantasy cover art, cinematic photoreal render. Near-black background, heavy chiaroscuro, a single dominant light source carving the subject out of darkness. Ornate late-gothic and baroque craftsmanship — engraved metal, filigree, aged patina, worn stone, weathered leather and parchment. Desaturated brown-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust motes and floating embers, shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on every surface, wet specular highlights on metal and stone. Sombre, reverent, weighty mood — no comedy, no bright daylight, no pastel colours.

Composition: vertical 3:4 portrait aspect ratio, 1200x1600. The subject sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table surface, shadow or fog — so a caption bar and a dark gradient can be laid over it without covering anything important. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no runic writing that resembles legible script, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a heavy pewter tavern tankard with an engraved hinged lid stands alone on a scarred oak table in a dim, empty tavern after closing. The lid has been pushed up from inside: a single wet, glistening tentacle rises out of the dark ale, coiling once around the tankard's handle and lifting its tip toward the top of the frame, suckers catching the light. Thick foam spills down the engraved side and drips onto the table; a few drops hang in mid-air. The only light is a faint bioluminescent glow coming from beneath the ale's surface and along the underside of the tentacle, rim-lighting the pewter and the foam. Behind, out of focus, an extinguished candle stub and a stack of hand-written parchment pages with blank, unreadable scribbles hint that someone was inventing things here. Accent colour: eerie bioluminescent teal.
```

## `public/images/categories/rules.webp` — Довідник правил

```
Dark high-fantasy cover art, cinematic photoreal render. Near-black background, heavy chiaroscuro, a single dominant light source carving the subject out of darkness. Ornate late-gothic and baroque craftsmanship — engraved metal, filigree, aged patina, worn stone, weathered leather and parchment. Desaturated brown-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust motes and floating embers, shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on every surface, wet specular highlights on metal and stone. Sombre, reverent, weighty mood — no comedy, no bright daylight, no pastel colours.

Composition: vertical 3:4 portrait aspect ratio, 1200x1600. The subject sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table surface, shadow or fog — so a caption bar and a dark gradient can be laid over it without covering anything important. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no runic writing that resembles legible script, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a colossal iron-bound tome closed on a carved lectern in a cathedral library, tilted toward the viewer so its tooled cover fills most of the frame. The cover bears a large embossed pair of balance scales inside concentric engraved rings — a device, not writing. Thin rings of light orbit slowly above the book; candle stubs burn along the lectern base. Accent colour: gold.
```

## `public/images/categories/infusions.webp` — Інфузії

```
Dark high-fantasy cover art, cinematic photoreal render. Near-black background, heavy chiaroscuro, a single dominant light source carving the subject out of darkness. Ornate late-gothic and baroque craftsmanship — engraved metal, filigree, aged patina, worn stone, weathered leather and parchment. Desaturated brown-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust motes and floating embers, shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on every surface, wet specular highlights on metal and stone. Sombre, reverent, weighty mood — no comedy, no bright daylight, no pastel colours.

Composition: vertical 3:4 portrait aspect ratio, 1200x1600. The subject sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table surface, shadow or fog — so a caption bar and a dark gradient can be laid over it without covering anything important. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no runic writing that resembles legible script, no logos, no watermarks, no borders or frames drawn into the image.

Subject: an artificer's workbench seen close and from above, dominated by a half-finished brass and steel gauntlet clamped in a vice, its knuckle housings open and a channel of energy being poured into them from a glass ampoule on a stand. Brass gears, calipers, coiled copper wire and a clockwork beetle lie around it; an unlabelled technical drawing with only lines and no lettering is pinned behind. Accent colour: brass with a cyan spark.
```

## `public/images/categories/bastions.webp` — Бастіони

```
Dark high-fantasy cover art, cinematic photoreal render. Near-black background, heavy chiaroscuro, a single dominant light source carving the subject out of darkness. Ornate late-gothic and baroque craftsmanship — engraved metal, filigree, aged patina, worn stone, weathered leather and parchment. Desaturated brown-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust motes and floating embers, shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on every surface, wet specular highlights on metal and stone. Sombre, reverent, weighty mood — no comedy, no bright daylight, no pastel colours.

Composition: vertical 3:4 portrait aspect ratio, 1200x1600. The subject sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table surface, shadow or fog — so a caption bar and a dark gradient can be laid over it without covering anything important. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no runic writing that resembles legible script, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a fortified stronghold keep standing alone on a black rock outcrop at night, seen from the courtyard gate looking up along the tower. Squat late-gothic masonry with buttresses, arrow slits and a barbican; every window and slit burns with warm hearth light from inside, so the keep reads as lived-in rather than ruined. A raised portcullis, a heavy iron-bound gate standing open, unmarked banners with plain heraldic shapes and no lettering hanging from the wall, a stone well and a stack of supply barrels in the near courtyard. Thin mist over the cobbles, embers drifting from a brazier out of frame. Accent colour: hearth gold spilling from the arrow slits.
```


## `public/images/categories/races.webp` — Раси / Види  *(заміна `ancestral_species_hall.webp`)*

Перемальовка. Стара картинка показувала расu як **портрети на стінах галереї** — сутність виду читалася з рами, а не з істоти. Тут вони стоять живими, і різницю несе силует.

```
Dark high-fantasy cover art, cinematic photoreal render. Near-black background, heavy chiaroscuro, a single dominant light source carving the subject out of darkness. Ornate late-gothic and baroque craftsmanship — engraved metal, filigree, aged patina, worn stone, weathered leather and parchment. Desaturated brown-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust motes and floating embers, shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on every surface, wet specular highlights on metal and stone. Sombre, reverent, weighty mood — no comedy, no bright daylight, no pastel colours.

Composition: vertical 3:4 portrait aspect ratio, 1200x1600. The subject sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table surface, shadow or fog — so a caption bar and a dark gradient can be laid over it without covering anything important. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no runic writing that resembles legible script, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a line-up of six figures of different peoples standing shoulder to shoulder in a torchlit stone hall, seen slightly from below so the silhouettes read against the darkness — a broad bearded dwarf in scale, a tall slender elf, a horned tiefling in a heavy cloak, a scaled dragonborn, a small halfling standing forward of the rest, and a hooded human. Height, build, horns, ears and tails differ sharply so the group reads as different peoples at a glance. Faces half in shadow, one warm lantern above and behind them. No portraits, no picture frames, no gallery walls. Accent colour: cold cyan light from a brazier at the left.
```

## `public/images/categories/classes.webp` — Класи  *(заміна `heroes_war_table.webp`)*

Перемальовка. Стара картинка — та сама сцена з воєнним столом, що й `feats.webp`, тож на головній «Класи» і «Риси» виглядали однаково.

```
Dark high-fantasy cover art, cinematic photoreal render. Near-black background, heavy chiaroscuro, a single dominant light source carving the subject out of darkness. Ornate late-gothic and baroque craftsmanship — engraved metal, filigree, aged patina, worn stone, weathered leather and parchment. Desaturated brown-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust motes and floating embers, shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on every surface, wet specular highlights on metal and stone. Sombre, reverent, weighty mood — no comedy, no bright daylight, no pastel colours.

Composition: vertical 3:4 portrait aspect ratio, 1200x1600. The subject sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table surface, shadow or fog — so a caption bar and a dark gradient can be laid over it without covering anything important. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no runic writing that resembles legible script, no logos, no watermarks, no borders or frames drawn into the image.

Subject: the working gear of six adventuring professions laid out in rows on a long stone bench under one hanging lantern, each set on its own worn cloth — a two-handed sword with a battered shield, an open spellbook with a focus crystal on a brass stand, a lute with a travelling cloak folded beneath it, a mace with a holy symbol on a chain, a longbow with a quiver of fletched arrows, and a set of blackened throwing knives on a rolled belt. Nothing is held by anyone; the bench is the subject. Accent colour: ember gold from the lantern.
```

## `public/images/categories/feats.webp` — Риси  *(перегенерація, стара дублює класи)*

Стара `feats.webp` — кроп тієї самої сцени з воєнним столом, що й обкладинка класів.

```
Dark high-fantasy cover art, cinematic photoreal render. Near-black background, heavy chiaroscuro, a single dominant light source carving the subject out of darkness. Ornate late-gothic and baroque craftsmanship — engraved metal, filigree, aged patina, worn stone, weathered leather and parchment. Desaturated brown-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust motes and floating embers, shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on every surface, wet specular highlights on metal and stone. Sombre, reverent, weighty mood — no comedy, no bright daylight, no pastel colours.

Composition: vertical 3:4 portrait aspect ratio, 1200x1600. The subject sits in the upper two thirds of the frame; the bottom third is deliberately quiet and dark — floor, table surface, shadow or fog — so a caption bar and a dark gradient can be laid over it without covering anything important. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no runic writing that resembles legible script, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a night training yard: a heavy scarred wooden pell post deeply gouged by years of blade work, a rack of practice weapons behind it, a straw dummy with a spear still buried in its shoulder, and chalk footwork arcs worn into the wet flagstones — shapes and curves only, never letters or numerals. One lantern on a post throws a long shadow across the yard; nobody is in frame. Accent colour: gold lantern light.
```


---

## Після генерації

Постпроцес перед комітом — інакше набір знову розповзеться по вазі:

```bash
# 3:4 категорії
node -e "require('sharp')('in.png').resize(1200,1600).webp({quality:80,effort:6}).toFile('out.webp')"
# 1:1 великі
node -e "require('sharp')('in.png').resize(1600,1600).webp({quality:80,effort:6}).toFile('out.webp')"
```

`sharp` уже стоїть у `node_modules` — окремо ставити нічого не треба.
Орієнтир ваги при 1200×1600 / q80 — 120–225 КБ на файл. Якщо якийсь вийшов помітно
важчим, це майже завжди зайвий дрібний шум у тлі: у промпті прибрати `dust motes`.

## Прапорці генераторів

| Генератор | Пропорція 3:4 | Пропорція 1:1 |
|---|---|---|
| Midjourney | `--ar 3:4` | `--ar 1:1` |
| DALL·E 3 / GPT Image | `1024x1365` (найближче) | `1024x1024` |
| Stable Diffusion / Flux | `896x1152` або `1024x1365` | `1024x1024` |

Генеруй у максимальній доступній роздільності, зменшуй до 1200×1600 / 1600×1600 на
постпроцесі — так різкіше, ніж генерувати одразу в цільовому розмірі.
