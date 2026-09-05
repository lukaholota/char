# Промпти на зображення походжень 2024

16 картинок — рівно стільки походжень у PHB 2024. Формат і стиль — **як у рас і класів**
(`public/images/races/`, `public/images/classes/`), а **не** як у `categories/`: там інший
набір, майже чорний натюрморт 3:4, і мішати їх не можна.

## Звідки взято стиль

Описано з наявних файлів (`races/human.webp`, `classes/bard.webp` та ін.), а не вигадано:

- **16:9, 1672×941** — рівно розмір наявних артів рас і класів;
- кінематографічний фотореал із живописним фінішем, а не натюрморт;
- одне практичне джерело світла в кадрі (факел, ліхтар, горно, штормове небо);
- фігура в **лівій половині**, обрізана по пояс/стегно, дивиться за кадр; права половина —
  середовище, яке пояснює ремесло;
- знебарвлена коричнево-сіра база + **рівно один** насичений акцент;
- дощ, іскри, пил, туман у повітрі; мала глибина різкості; темна віньєтка.

**Чому низ кадру мусить бути тихий:** [`CatalogIllustrationCard.tsx:80`](../../src/components/catalogs/CatalogIllustrationCard.tsx#L80)
кладе на нижні 3/5 градієнт у `#0b0a11` і пише поверх назву, англійську назву й мета-рядок.
Картинка з важливою деталлю внизу втратить її під підписом.

## Акцентні кольори по набору

Щоб 16 карток не злилися в одну бурштинову стіну.

| Походження | Акцент |
|---|---|
| Служитель | свічкове золото |
| Ремісник | мідь і латунь |
| Шахрай | фіолетовий |
| Злочинець | холодний бірюзовий |
| Артист | вогняний помаранчевий |
| Фермер | вохра заходу сонця |
| Вартовий | смолоскиповий бурштин |
| Провідник | місячне срібло-блакить |
| Відлюдник | мохово-зелений |
| Торговець | шафран |
| Шляхтич | кармін |
| Мудрець | синьо-фіолетова аркана |
| Моряк | штормовий бірюзовий |
| Писар | холодна слонова кістка |
| Солдат | жар вугілля |
| Мандрівник | індиго сутінків |

## Види в кадрі — навмисно різні

Набір із шістнадцяти однакових бородатих людей — це провал каталогу. Вид і стать розписані
наперед і **навмисно** розкидані: людина, дварф, ельф, напіврослик, гном, орк, тифлінг,
драконороджений, голіаф. Це 2024, тож напівельфів і напіворків у списку немає — їх у цій
редакції не існує. Вид можна міняти, але тоді міняй по всьому набору, а не в одному промпті.

## Спільний негативний промпт

```
text, letters, numerals, legible script on books, signs or banners, calligraphy, logo,
watermark, signature, caption, UI, decorative border, picture frame, bright daylight,
pastel colors, flat lighting, cartoon, anime, cel shading, low detail, plastic skin,
extra fingers, deformed hands, subject centred, busy detail in the bottom third
```

## Як користуватись

Перші два абзаци в кожному промпті **однакові дослівно**. Не переписуй їх «своїми словами»
під окрему картинку — саме так набір `categories/` колись розповзся на три стилі.
Змінюється тільки абзац `Subject:` і акцент у його останньому реченні.

---

## `public/images/backgrounds/acolyte.webp` — Служитель

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. A single figure stands in the left half of the frame, cut at the waist or mid-thigh, turned three quarters away from the camera and looking off frame; the right half opens onto the environment that explains their trade, receding into haze. The bottom third of the frame is deliberately quiet and dark — floor, table, water, ground fog — because a dark gradient and a caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no legible writing on books, signs or banners, no logos, no watermarks, no borders or frames drawn into the image.

Subject: an elderly human woman in a temple acolyte's layered robes, a censer on a chain smoking in her raised hand, prayer beads and a plain metal holy symbol at her belt, ink-stained fingers from copying prayers. She stands in the side aisle of a vaulted stone temple; behind her on the right a bank of votive candles climbs into the dark and a shaft of light falls across a worn altar. Accent colour: warm candle gold.
```

## `public/images/backgrounds/artisan.webp` — Ремісник

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. A single figure stands in the left half of the frame, cut at the waist or mid-thigh, turned three quarters away from the camera and looking off frame; the right half opens onto the environment that explains their trade, receding into haze. The bottom third of the frame is deliberately quiet and dark — floor, table, water, ground fog — because a dark gradient and a caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no legible writing on books, signs or banners, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a dwarf woman craftsman in a leather apron over rolled sleeves, braided beard-rings and burn scars on her forearms, holding a chasing hammer and a half-finished engraved silver bracer up to the light. Her bench fills the right of the frame — racks of chisels, gravers, files and clamps, a small charcoal brazier throwing the only warm light, curls of metal shaving on the wood. Accent colour: copper and brass.
```

## `public/images/backgrounds/charlatan.webp` — Шахрай

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. A single figure stands in the left half of the frame, cut at the waist or mid-thigh, turned three quarters away from the camera and looking off frame; the right half opens onto the environment that explains their trade, receding into haze. The bottom third of the frame is deliberately quiet and dark — floor, table, water, ground fog — because a dark gradient and a caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no legible writing on books, signs or banners, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a human man in fine clothes that do not quite fit him, a borrowed velvet doublet with a frayed cuff, half-smiling as he presses a signet into a bead of hot wax on a folded letter. The back room of a tavern opens behind him on the right: a forgery kit spread open, blank seals, a shaving mirror, two mismatched noble coats hanging on a peg, one candle guttering. Accent colour: cold violet.
```

## `public/images/backgrounds/criminal.webp` — Злочинець

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. A single figure stands in the left half of the frame, cut at the waist or mid-thigh, turned three quarters away from the camera and looking off frame; the right half opens onto the environment that explains their trade, receding into haze. The bottom third of the frame is deliberately quiet and dark — floor, table, water, ground fog — because a dark gradient and a caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no legible writing on books, signs or banners, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a halfling woman crouched at a heavy iron warehouse lock, hood up, two slim picks held steady in gloved fingers, head tilted to listen to the tumblers. A rain-slick city alley recedes on the right, wet cobbles throwing back the light of a single shuttered lantern set on the ground; a rope and grapple coil beside her boot. Accent colour: cold cyan.
```

## `public/images/backgrounds/entertainer.webp` — Артист

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. A single figure stands in the left half of the frame, cut at the waist or mid-thigh, turned three quarters away from the camera and looking off frame; the right half opens onto the environment that explains their trade, receding into haze. The bottom third of the frame is deliberately quiet and dark — floor, table, water, ground fog — because a dark gradient and a caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no legible writing on books, signs or banners, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a tiefling woman mid-performance on a plank stage, back arched, one arm sweeping a lit fire-poi through the air so the flame trail is the light source of the whole scene; ribboned costume, coin-hung sash, bare feet on the boards. The right of the frame is a night market crowd dissolved into bokeh and smoke, a tumbler's hoop and a drum left at the stage edge. Accent colour: fire orange.
```

## `public/images/backgrounds/farmer.webp` — Фермер

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. A single figure stands in the left half of the frame, cut at the waist or mid-thigh, turned three quarters away from the camera and looking off frame; the right half opens onto the environment that explains their trade, receding into haze. The bottom third of the frame is deliberately quiet and dark — floor, table, water, ground fog — because a dark gradient and a caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no legible writing on books, signs or banners, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a goliath man resting both hands on the shaft of a long scythe at the end of a working day, homespun shirt open at the throat, chaff and dust on his shoulders, a carpenter's mallet through his belt. Behind him on the right a cut wheat field runs to a low barn and a hedge; the last of the sun is behind the hedge, back-lighting the airborne dust into a solid glow. Accent colour: sunset ochre.
```

## `public/images/backgrounds/guard.webp` — Вартовий

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. A single figure stands in the left half of the frame, cut at the waist or mid-thigh, turned three quarters away from the camera and looking off frame; the right half opens onto the environment that explains their trade, receding into haze. The bottom third of the frame is deliberately quiet and dark — floor, table, water, ground fog — because a dark gradient and a caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no legible writing on books, signs or banners, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a dwarf man on night watch at a city gate, mail under a studded surcoat, halberd planted, one hand on the rim of a fire brazier for warmth, breath visible in the cold. The gate arch and portcullis fill the right of the frame; beyond it the road drops away into fog, and a second brazier burns small and distant on the far side. Accent colour: torch amber.
```

## `public/images/backgrounds/guide.webp` — Провідник

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. A single figure stands in the left half of the frame, cut at the waist or mid-thigh, turned three quarters away from the camera and looking off frame; the right half opens onto the environment that explains their trade, receding into haze. The bottom third of the frame is deliberately quiet and dark — floor, table, water, ground fog — because a dark gradient and a caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no legible writing on books, signs or banners, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a wood elf woman halted on a high forest ledge, hooded travel cloak beaded with mist, a cartographer's case open against her hip and a blank vellum sheet held half-rolled, her other hand steadying a small brass sighting compass. The right of the frame falls away into a moonlit valley of conifers and drifting cloud; the moon itself is out of frame and is the only light. Accent colour: moonlit silver-blue.
```

## `public/images/backgrounds/hermit.webp` — Відлюдник

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. A single figure stands in the left half of the frame, cut at the waist or mid-thigh, turned three quarters away from the camera and looking off frame; the right half opens onto the environment that explains their trade, receding into haze. The bottom third of the frame is deliberately quiet and dark — floor, table, water, ground fog — because a dark gradient and a caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no legible writing on books, signs or banners, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a very old gnome man at the mouth of a hillside hermitage, wrapped in a patched wool blanket, sorting cut herbs into the compartments of a worn herbalism kit on his knees, a mortar and a bundle of drying roots beside him. The right of the frame is the wet forest he lives in, ferns and moss-covered stone, a thin waterfall thread in the far haze; light comes from a small hearth just inside the cave behind his shoulder. Accent colour: moss green.
```

## `public/images/backgrounds/merchant.webp` — Торговець

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. A single figure stands in the left half of the frame, cut at the waist or mid-thigh, turned three quarters away from the camera and looking off frame; the right half opens onto the environment that explains their trade, receding into haze. The bottom third of the frame is deliberately quiet and dark — floor, table, water, ground fog — because a dark gradient and a caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no legible writing on books, signs or banners, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a middle-aged human man checking a caravan load by lamplight, travel coat over a merchant's good waistcoat, a set of hand scales hanging from one fist and a navigator's dividers tucked behind his ear, a heavy purse and a mule's harness at his side. The right of the frame is the tail of the caravan — roped crates, a canvas-covered waggon, two more lamps small in the dust further down the road. Accent colour: saffron.
```

## `public/images/backgrounds/noble.webp` — Шляхтич

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. A single figure stands in the left half of the frame, cut at the waist or mid-thigh, turned three quarters away from the camera and looking off frame; the right half opens onto the environment that explains their trade, receding into haze. The bottom third of the frame is deliberately quiet and dark — floor, table, water, ground fog — because a dark gradient and a caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no legible writing on books, signs or banners, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a dragonborn woman of high birth on the gallery above a great hall, brocade court coat with a chased metal gorget, rings over her scaled fingers, one clawed hand resting on the carved balustrade as she looks down at something out of frame. The hall below and right is candle-lit and half empty — a long table, hanging banners kept deliberately blank, a dice-and-counters gaming set abandoned mid-game. Accent colour: deep crimson.
```

## `public/images/backgrounds/sage.webp` — Мудрець

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. A single figure stands in the left half of the frame, cut at the waist or mid-thigh, turned three quarters away from the camera and looking off frame; the right half opens onto the environment that explains their trade, receding into haze. The bottom third of the frame is deliberately quiet and dark — floor, table, water, ground fog — because a dark gradient and a caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no legible writing on books, signs or banners, no logos, no watermarks, no borders or frames drawn into the image.

Subject: an elderly elf man deep in a library stack at night, long scholar's robe, spectacles pushed up, holding a heavy volume open on one forearm while his other hand hovers over a small floating glyph of cold light he has just called up to read by — the glyph is the light source, abstract and not legible as writing. Ladders, shelves and a globe-and-armillary recede into darkness on the right. Accent colour: arcane blue-violet.
```

## `public/images/backgrounds/sailor.webp` — Моряк

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. A single figure stands in the left half of the frame, cut at the waist or mid-thigh, turned three quarters away from the camera and looking off frame; the right half opens onto the environment that explains their trade, receding into haze. The bottom third of the frame is deliberately quiet and dark — floor, table, water, ground fog — because a dark gradient and a caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no legible writing on books, signs or banners, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a weather-beaten human woman hauling on a wet sheet-line at the rail of a ship under a squall, oilskin over a knitted jersey, rope burns on her palms, a brass navigator's instrument swinging on a lanyard at her chest. The right of the frame is heaving grey-green sea and a torn sky; the ship's stern lantern behind her shoulder is the only warm light against it. Accent colour: storm teal.
```

## `public/images/backgrounds/scribe.webp` — Писар

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. A single figure stands in the left half of the frame, cut at the waist or mid-thigh, turned three quarters away from the camera and looking off frame; the right half opens onto the environment that explains their trade, receding into haze. The bottom third of the frame is deliberately quiet and dark — floor, table, water, ground fog — because a dark gradient and a caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no legible writing on books, signs or banners, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a gnome woman copyist at a high slanted desk in a records hall, sleeve garters and ink to the second knuckle, a cut quill paused above a sheet whose marks stay an illegible grey wash, a knife and a sand shaker at her elbow. Behind her on the right, pigeonholes of rolled documents climb out of the light; a single hooded oil lamp on a swing arm lights her hands and nothing else. Accent colour: cool ivory white.
```

## `public/images/backgrounds/soldier.webp` — Солдат

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. A single figure stands in the left half of the frame, cut at the waist or mid-thigh, turned three quarters away from the camera and looking off frame; the right half opens onto the environment that explains their trade, receding into haze. The bottom third of the frame is deliberately quiet and dark — floor, table, water, ground fog — because a dark gradient and a caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no legible writing on books, signs or banners, no logos, no watermarks, no borders or frames drawn into the image.

Subject: an orc man in a veteran's battered half-plate standing down after a fight, helm under one arm, a notched longsword point-down in the churned ground, blood and soot on his tusked jaw, a company badge kept deliberately shapeless. The right of the frame is a night camp on a ridge — tents, stacked spears, a bonfire throwing embers upward through smoke. Accent colour: ember red.
```

## `public/images/backgrounds/wayfarer.webp` — Мандрівник

```
Cinematic dark-fantasy character art, photoreal render with a painterly finish. One dominant practical light source inside the scene — flame, lantern, forge glow or storm light — carving the figure out of a deep atmospheric background; heavy chiaroscuro, rich shadow detail, no flat fill light. Weathered, historically grounded costume: worn leather, wool and linen, patinated metal, engraved fittings, honest dirt and wear. Desaturated brown-grey-black base palette lifted by exactly one saturated accent colour. Volumetric light shafts, drifting dust, embers, rain or mist in the air; shallow depth of field with a softly blurred background, strong dark vignette on all four edges. Dense micro-detail on skin, cloth and metal, wet specular highlights. 8k, ultra detailed, sharp focus on the face and hands, anamorphic film still, 35mm, subtle film grain, sombre and dignified mood — no comedy, no bright daylight, no pastel colours.

Composition: cinematic 16:9 landscape, 1672x941. A single figure stands in the left half of the frame, cut at the waist or mid-thigh, turned three quarters away from the camera and looking off frame; the right half opens onto the environment that explains their trade, receding into haze. The bottom third of the frame is deliberately quiet and dark — floor, table, water, ground fog — because a dark gradient and a caption are laid over it. Nothing important touches the outer 6% of any edge. Absolutely no text, no letters, no numerals, no legible writing on books, signs or banners, no logos, no watermarks, no borders or frames drawn into the image.

Subject: a young human man who grew up on the street, wiry, in layered scavenged clothes with everything he owns in a rolled blanket across his back, sitting on the parapet of a bridge at dusk with a set of lockpicks and a lucky coin turning between his fingers. The right of the frame is a rooftop city sinking into blue twilight, the first lamps being lit far below along the water. Accent colour: twilight indigo.
```

---

## Вшивання

1. **Файли** — `public/images/backgrounds/<slug>.webp`, 1672×941, як у рас і класів
   (~150–240 КБ на файл, разом ≈ 3–4 МБ; кешована поверхня росте з 56 МБ до ~60 МБ).
2. **Мапа** — `BACKGROUND_IMAGE_MAP` у [`src/lib/assets/image-manifest.ts`](../../src/lib/assets/image-manifest.ts)
   поруч із `RACE_IMAGE_MAP` і `CLASS_IMAGE_MAP`, плюс `getBackgroundImagePath`. Не заводити
   другий файл під це.
3. **Режим без ШІ** — дописати `/images/backgrounds/` у `PROVENANCE_BY_PREFIX`
   ([`src/lib/assets/asset-provenance.ts:31`](../../src/lib/assets/asset-provenance.ts#L31))
   зі значенням `ai`. Пропустиш — картинки лишаться видимими там, де їх не має бути; ту саму
   дірку вже раз закривали для `/images/home/` ([Р у DECISIONS](../DECISIONS.md)).
4. **Картка** — `BackgroundsClient` зараз малює lucide-іконку за джерелом
   ([`catalog-visuals.ts:638`](../../src/components/catalogs/catalog-visuals.ts#L638)).
   Перевести на `CatalogIllustrationCard`, а не писати третю картку з нуля.

## Бонус: 16 файлів покривають і 2014

Дев'ять походжень 2014 — це те саме поняття, що й у 2024, тож арт перевикористовується без
генерації:

| Файл | 2024 | 2014 |
|---|---|---|
| `acolyte` | ACOLYTE | ACOLYTE |
| `artisan` | ARTISAN_2024 | GUILD_ARTISAN |
| `charlatan` | CHARLATAN_2024 | CHARLATAN |
| `criminal` | CRIMINAL_2024 | CRIMINAL, SPY |
| `entertainer` | ENTERTAINER_2024 | ENTERTAINER, GLADIATOR |
| `guard` | GUARD_2024 | CITY_WATCH |
| `hermit` | HERMIT_2024 | HERMIT |
| `merchant` | MERCHANT_2024 | GUILD_MERCHANT |
| `noble` | NOBLE_2024 | NOBLE, KNIGHT |
| `sage` | SAGE_2024 | SAGE, CLOISTERED_SCHOLAR |
| `sailor` | SAILOR_2024 | SAILOR, PIRATE |
| `soldier` | SOLDIER_2024 | SOLDIER |

Тобто ці 16 картинок закривають 16 карток 2024 і ще 15 карток 2014.

**Спільний арт — тимчасовий.** Рішення власника 2026-09-01: двійники розводяться, у кожного
походження свій кадр. Промпти на ці вісім плюс на «Власну» —
[image-prompts-backgrounds-splits.md](image-prompts-backgrounds-splits.md). Кінцевий стан
набору — **82 файли на всі 90 значень** `BackgroundCategory`.

**Решта — у [image-prompts-backgrounds-rest.md](image-prompts-backgrounds-rest.md):** ще 57
промптів на всі інші походження, від `FOLK_HERO` до сетингових з Равніки, Стріксгейвену,
Вайлдмаунту й Плейнскейпу. Разом 73 файли на 89 із 90 значень `BackgroundCategory`
(`CUSTOM` арту не отримує — його зміст вигадує гравець). Повний набір важить ≈ 15 МБ,
тобто `public/images` росте з 56 МБ до ~71 МБ.
