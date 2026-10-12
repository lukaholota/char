# «Детектив» (VRGR Investigator): що зробити в коді після SQL власника

Назву «Детектив» погодив власник (2026-10-10). Передісторія додає нове значення переліку `BackgroundCategory`, тому код не можна писати до `db:pull`.

1. Власник застосовує `detective-background-vrgr-step1-owner-applies.sql`, потім `…-step2-…` (кроки окремо), далі `bun run db:pull`.
2. Код (окремою задачею, після `db:pull`):
   - `src/lib/refs/translation.ts` і `src/lib/refs/dictionary.json` (`CONTENT_TRANSLATIONS`): `INVESTIGATOR_VRGTR` → «Детектив»; англійський напис — «Investigator (VRGR)».
   - `prisma/seed/backgroundSeed.ts`: той самий рядок, що в step2 (навички вибору `choices`, інструменти `DISGUISE_KIT`, `THIEVES_TOOLS`).
   - Каталог: `bun run generate:creator-content` не запускати з продакшн-базою; рядок додати в `src/lib/generated/creator-content-2014.json` і `backgrounds.json` точково (з резервною копією), як для кобольда.
   - Пресети: `artificer-alchemist-fairy-2014`, `artificer-armorer-vedalken-2014`, `artificer-artillerist-centaur-2014`, `bard-creation-2014` переходять з налаштованого «Слідчого» (SCAG) на «Детектива». Для вибору двох навичок з трьох у шарі пресетів потрібна підтримка фонових навичок за списком (зараз лише фіксовані й `CUSTOM`).
3. Назва особливості «Official Inquiry» лишається англійською, доки власник не погодить український відповідник (пропозиція: «Офіційне розслідування»).
