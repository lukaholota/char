# sorcerer-metamagic-2014: notes

## Heading ratings not compiled (tool limit)

The page has a colour rating on every option heading, twice: main section "Metamagic Options" and the
"Metamagic Adept" section, with identical English heading text. `plan_ratings` in
`scripts/rpgbot/article_worksheet.py` matches a heading signal by its English text and needs exactly one
section candidate, so all 20 signals (issue indices 4..23) stay unmatched. The draft has `ratings: 0`;
the sheet headers say `rating: none`. The 20 decisions in `data/rpgbot/authoring/sorcerer-metamagic-2014.decisions.json`
are `excluded-noncontent` only to let the compile pass. The signal location (`#careful-spell`,
`#metamagic-adept-careful-spell`) identifies the section (`section-` + anchor), so matching by location would fix it.

Colours by section (issue index in brackets):

| Option | Main section | Metamagic Adept section |
|---|---|---|
| Careful Spell | orange (4) | red (14) |
| Distant Spell | orange (5) | red (15) |
| Empowered Spell | green (6) | orange (16) |
| Extended Spell | orange (7) | green (17) |
| Heightened Spell | blue (8) | red (18) |
| Quickened Spell | blue (9) | orange (19) |
| Seeking Spell (Optional) | green (10) | red (20) |
| Subtle Spell | orange (11) | orange (21) |
| Transmuted Spell (Optional) | green (12) | green (22) |
| Twinned Spell | blue (13) | green (23) |

## Source oddities translated as written

- `block-section-subtle-spell-2`: "Spells without an obvious visual component (a fireball, a bolt of lightning, etc.)": the examples
  are spells with a visible effect, so "without" may be meant as "with" or "with only". Kept as written.
- `block-section-twinned-spell-3`: "Twin Spell" (instead of Twinned Spell) rendered as «Спарене заклинання».
- `block-section-subtle-spell-3`: "an are of magical Silence" (typo for "area"); read as the spell Silence.
- `block-section-metamagic-adept-extended-spell-2`: "before your take a Long Rest" (typo for "you").
- `block-section-metamagic-adept-twinned-spell-1`: "Dicuss" is a typo for "Discuss".

## Rendering choices

- "Dragon Talk Podcast" link text keeps the podcast title in Latin (brand name), as in `tr_druid-wild-shape-2014.py`;
  this is the single quality flag.
- "1-Action spell" is «заклинання з часом накладання 1 дія».
- "blaster" is «нюкер» (role word, no marker); "blaster Warlocks" is «чорнокнижників у ролі нюкерів».
- Option names come from `metamagic.json` («Обережне заклинання», «Віддалене заклинання», «Підсилене заклинання»,
  «Подовжене заклинання», «Підвищене заклинання», «Пришвидшене заклинання», «Спрямоване заклинання»,
  «Приховане заклинання», «Перетворене заклинання», «Спарене заклинання»).
