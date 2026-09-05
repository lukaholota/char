-- D-001: одна англійська назва — одна риса
--
-- `feature.eng_name` унікальний на всю базу, а в D&D англійські назви рис повторюються.
-- Сіди роблять upsert за eng_name, тож дві різні риси ділили один рядок: хто засідився
-- останнім, стирав текст першого, і обидва власники показували його механіку. Бард /
-- Колегія шепотів через це показував риси Пройдисвіта / Ножа душі (пост на Reddit,
-- 2026-08-28), раса Перевертень — рису чарівника-трансмутатора 10 рівня. Злитих назв: 15.
--
-- Що робить скрипт:
--   1) заводить 30 рядків із розведеними назвами «Назва (Власник)»; текст і механіка взяті
--      з prisma/seed/*FeatureSeed.ts — знято прогоном сідерів на spells_test, не переписано руками;
--   2) перевішує на них зв'язки кожного власника (subclass_feature, race_trait, subrace_trait,
--      race_choice_option_trait) і риси вже створених персонажів (pers_feature);
--   3) видаляє старі злиті рядки — але лише якщо на них уже ніщо не посилається; інакше падає
--      з переліком того, що лишилося, і нічого не чіпає (усе в одній транзакції).
--
-- Ідемпотентний: повторний прогін нічого не змінює.
-- Перевірено на spells_test (контент) і на spells_scratch (повна копія з персонажами) 2026-08-28. Разом із ним ідуть перейменування в сідах і
-- tests/content/feature-eng-names-unique.test.ts, який не дає колізії з'явитися знову.
--
-- УВАГА: pers_feature — це риси реальних персонажів. Кожен рядок перевішується за расою,
-- підрасою або підкласом самого персонажа, тому риса не зникає й не міняє змісту.

-- Скидає транзакцію, якщо сесія лишилася в зламаній після попередньої спроби: інакше Postgres
-- ігнорує геть усе («current transaction is aborted»), а видно лише стару помилку, і здається,
-- що скрипт не полагоджений. У чистій сесії це просто попередження «no transaction in progress».
ROLLBACK;

BEGIN;

-- ── 1. Рядки з розведеними назвами ───────────────────────────────────────────

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Психічні леза', 'На 3 рівні, коли ви вступаєте до Колегії шепотів, ви здобуваєте здатність робити свої атаки зброєю магічно згубними для розуму істоти.

Коли ви влучаєте по істоті атакою зброєю, ви можете витратити одне використання Бардського натхнення, щоб завдати цій цілі додатково 2к6 психічної шкоди. Ви можете робити це лише один раз за раунд у свій хід.

Психічна шкода зростає, коли ви досягаєте певних рівнів у цьому класі: до 3к6 на 5 рівні, 5к6 на 10 рівні та 8к6 на 15 рівні.', 'Коли влучаєте атакою зброєю, можете витратити Бардське натхнення, щоб завдати додаткової психічної шкоди; вона зростає з рівнем.', NULL, NULL, '{PASSIVE}', '2026-08-28 18:47:18.037', '2026-08-28 18:47:18.037', 'Psychic Blades (College of Whispers)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', 'BARDIC_INSPIRATION', 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Псіонічна енергія', 'Починаючи з 3-го рівня, ви приховуєте в собі джерело псіонічної енергії. Цю енергію представляють ваші кістки Псіонічної Енергії, кожна з яких є к6. Ви маєте кількість таких кісток, що дорівнює подвоєному вашому бонусу майстерності, і вони живлять різні ваші псіонічні сили, описані нижче.

Деякі з ваших сил витрачають кістку Псіонічної Енергії, як зазначено в описі відповідної сили, і ви не можете використовувати силу, якщо вона вимагає використання кістки, а всі ваші кістки вже витрачені. Ви відновлюєте всі витрачені кістки Псіонічної Енергії, коли завершуєте довгий відпочинок. Крім того, бонусною дією ви можете відновити одну витрачену кістку Псіонічної Енергії, але після цього не можете робити це знову, доки не завершите короткий або довгий відпочинок.

Коли ви досягаєте певних рівнів у цьому класі, розмір ваших кісток Псіонічної Енергії зростає: на 5-му рівні — до к8, на 11-му — до к10, а на 17-му — до к12. Нижче наведені сили використовують ваші кістки Псіонічної Енергії.', 'Ви маєте запас псіонічної енергії, представлений кубиками псіонічної енергії.', 'LONG_REST', NULL, '{CLASS_RESOURCE}', '2026-08-28 18:47:20.884', '2026-08-28 18:47:20.884', 'Psionic Power (Soulknife)', '{"type": "FORMULA", "group": "PROFICIENCY_BONUS", "operation": "MULTIPLY", "multiplier": 2}', false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', 'PSIONIC_ENERGY', 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Психічні леза', 'Також на 3-му рівні ви можете проявляти свою псіонічну силу як мерехтливі леза психічної енергії. Щоразу, коли ви виконуєте дію Атака, ви можете створити психічне лезо у вільній руці й здійснити атаку цим лезом. Це магічне лезо є простою зброєю ближнього бою з властивостями «фехтувальна» і «метальна». Воно має нормальну дальність 60 футів і не має максимальної дальності, а при влучанні завдає психічної шкоди 1к6 + модифікатор характеристики, який ви використали для кидка атаки. Лезо зникає одразу після того, як влучає чи промахується по цілі, і не залишає на ній жодного сліду, якщо завдає шкоди.

Після того як ви атакуєте цим лезом, ви можете в той самий хід здійснити атаку зброєю ближнього чи дальнього бою другим психічним лезом бонусною дією, за умови, що ваша інша рука вільна для його створення. Кістка шкоди цієї бонусної атаки дорівнює 1к4 замість 1к6.', 'Матеріалізація лез психічної енергії для атаки.', NULL, NULL, '{PASSIVE}', '2026-08-28 18:47:21.006', '2026-08-28 18:47:21.006', 'Psychic Blades (Soulknife)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Плащ тіней', 'Коли ви перебуваєте в тьмяному світлі або темряві, ви можете дією стати невидимим. Ви залишаєтеся невидимим, поки не атакуєте, не накладете заклинання або не опинитеся в області яскравого світла.', 'Ставайте невидимим у тіні.', NULL, NULL, '{ACTION}', '2026-08-28 18:47:23.375', '2026-08-28 18:47:23.375', 'Cloak of Shadows (Way of Shadow)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Псі-енергія', 'На 3 рівні ви приховуєте в собі джерело псіонічної енергії. Цю енергію представляють ваші кубики пси-енергії, кожен з яких є к6. Ви маєте кількість цих кубиків, що дорівнює подвоєному вашому Бонусу Майстерності, і вони живлять різноманітні псіонічні сили, описані нижче.

Деякі з ваших сил витрачають кубик пси-енергії, як зазначено в описі сили, і ви не можете використати силу, якщо вона вимагає використання кубика, а всі ваші кубики вже витрачені. Ви відновлюєте всі витрачені кубики пси-енергії після завершення тривалого відпочинку. Крім того, бонусною дією ви можете відновити один витрачений кубик пси-енергії, але після цього не можете зробити цього знову, доки не завершите короткий або тривалий відпочинок.

Коли ви досягаєте певних рівнів у цьому класі, розмір ваших кубиків пси-енергії зростає: на 5 рівні — до к8, на 11 — до к10, а на 17 — до к12.

Наведені нижче сили використовують ваші кубики пси-енергії: Захисне поле, Псі-удар і Телекінетичний рух.', 'Псі-кубики (d6 → d8/d10/d12) у кількості 2×БМ; опції: Захисне поле, Псі-удар, Телекінетичний рух.', 'LONG_REST', NULL, '{CLASS_RESOURCE}', '2026-08-28 18:46:57.562', '2026-08-28 18:46:57.562', 'Psionic Power (Psi Warrior)', '{"type": "FORMULA", "group": "PROFICIENCY_BONUS", "operation": "MULTIPLY", "multiplier": 2}', false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', 'PSIONIC_ENERGY', 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Кам''яна витривалість', 'Ваш максимум хіт-поінтів збільшується на 1, і він збільшується на 1 кожного разу, коли ви отримуєте рівень.', '+1 HP на рівень', NULL, NULL, '{PASSIVE}', '2026-08-28 18:46:36.32', '2026-08-28 18:46:36.32', 'Dwarven Toughness (Dwarf Race)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Дворфська витонченість', 'Ви маєте володіння легким і середнім обладунком.', 'Володіння легким та середнім обладунком', NULL, NULL, '{PASSIVE}', '2026-08-28 18:46:36.4', '2026-08-28 18:46:36.4', 'Dwarven Armor Training (Dwarf Race)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Перевертень', 'Дією ви можете змінити свій зовнішній вигляд та свій голос. Ви вирішуєте, як виглядаєте, включно зі статтю, висотою, вагою, рисами обличчя, звучанням вашого голоса, кольором волосся, кольором шкіри та іншими відмітними характеристиками. Ви можете здаватися іншої раси, але жодна з ваших ігрових характеристик не змінюється. Ви не можете дублювати зовнішність персони, яку ніколи не бачили, і ви повинні прийняти форму з таким самим базовим розташуванням кінцівок, як у вас. Ваш одяг та спорядження не змінюються. Ви залишаєтеся в новій формі, доки не повернетеся до своєї справжньої форми дією або доки не помрете.', 'Зміна зовнішності Дією', NULL, NULL, '{ACTION}', '2026-08-28 18:46:37.605', '2026-08-28 18:46:37.605', 'Shapechanger (Changeling)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Кам''яне маскування', 'Ви маєте перевагу на перевірки Спритності (Непомітність), щоб сховатися в кам''яному середовищі.', 'Перевага на Непомітність у каменях', NULL, NULL, '{PASSIVE}', '2026-08-28 18:46:37.644', '2026-08-28 18:46:37.644', 'Stone Camouflage (Deep Gnome Race)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Стійкість дуергарів', 'Ви маєте перевагу на ряткидки проти ілюзій та проти зачарування або паралічу.', 'Перевага проти ілюзій, зачарування, паралічу', NULL, NULL, '{PASSIVE}', '2026-08-28 18:46:38.021', '2026-08-28 18:46:38.021', 'Duergar Resilience (Duergar Race)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Магія дуергарів', 'Коли ви досягаєте 3-го рівня, ви можете один раз використати заклинання Збільшення/Зменшення [Enlarge/Reduce] на себе. Коли ви досягаєте 5-го рівня, ви також можете один раз використати заклинання Невидимість [Invisibility] на себе. Після використання кожного з цих заклять ви не можете використовувати це заклинання знову, доки не завершите довгий відпочинок. Ви також можете використовувати ці заклинання, використовуючи будь-які слоти заклинань відповідного рівня, які у вас є. Інтелект, Мудрість або Харизма є вашою характеристикою для цих заклинань, коли ви використовуєте їх цією здібністю (ви обираєте при виборі цієї раси).', 'Збільшення/Зменшення [Enlarge/Reduce], Невидимість [Invisibility]', 'LONG_REST', NULL, '{PASSIVE}', '2026-08-28 18:46:38.061', '2026-08-28 18:46:38.061', 'Duergar Magic (Duergar Race)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Дитя моря', 'Ви маєте швидкість плавання 30 футів, можете дихати під водою, і маєте опір до Холодної шкоди', 'Плавання 30 футів, дихання під водою + опір Холоду', NULL, NULL, '{PASSIVE}', '2026-08-28 18:46:42.078', '2026-08-28 18:46:42.078', 'Child of the Sea (Sea Elf Race)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Друг моря', 'Водні тварини мають надзвичайну спорідненість з вашим народом. Ви можете передавати прості ідеї будь-якому Звіру, що має швидкість плавання. Він може розуміти ваші слова, хоча ви не маєте спеціальної здібності розуміти його у відповідь.', 'Комунікація з водними тваринами', NULL, NULL, '{PASSIVE}', '2026-08-28 18:46:42.261', '2026-08-28 18:46:42.261', 'Friend of the Sea (Sea Elf Race)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Благословення воронячої королеви', 'Бонусною дією ви можете магічно телепортуватися на відстань до 30 футів у вільний простір, який ви бачите. Починаючи з 3 рівня, після телепортації ви маєте опір до всіх видів шкоди до початку вашого наступного ходу, а ваш зовнішній вигляд стає примарним та напівпрозорим. Ви можете використовувати цю здібність кількість разів, що дорівнює вашому Бонусу Майстерності, і відновлюєте всі витрачені використання після завершення довгого відпочинку.', 'Телепорт 30 футів + опір шкоді', 'LONG_REST', NULL, '{BONUSACTION}', '2026-08-28 18:46:42.307', '2026-08-28 18:46:42.307', 'Blessing of the Raven Queen (Shadar-kai Race)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Некротичний опір', 'Ви маєте опір до некротичної шкоди.', 'Опір до некротичної шкоди', NULL, NULL, '{PASSIVE}', '2026-08-28 18:46:42.345', '2026-08-28 18:46:42.345', 'Necrotic Resistance (Shadar-kai Race)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Променева душа', 'З вашої спини виростають два світлові ефірні крила, даруючи вам швидкість польоту 30 футів. На додаток, один раз у кожен свій хід, ви можете завдати додаткову променеву шкоду 1к10 одній цілі при влученні атакою. Трансформація триває 1 хвилину або до кінця вашого ходу, якщо ви втратили свідомість.', 'Політ 30 футів + 1к10 променевої шкоди', 'LONG_REST', 1, '{BONUSACTION}', '2026-08-28 18:46:50.249', '2026-08-28 18:46:50.249', 'Radiant Soul (Aasimar)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Дитя моря', 'Ви маєте швидкість плавання 30 футів, і ви можете дихати повітрям і водою.', 'Плавання 30 футів, амфібія', NULL, NULL, '{PASSIVE}', '2026-08-28 18:46:52.413', '2026-08-28 18:46:52.413', 'Child of the Sea (Sea Elf Subrace)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Друг моря', 'Використовуючи жести та звуки, ви можете спілкуватися з будь-яким звіром, який має вроджену швидкість плавання.', 'Спілкування з морськими звірами', NULL, NULL, '{PASSIVE}', '2026-08-28 18:46:52.449', '2026-08-28 18:46:52.449', 'Friend of the Sea (Sea Elf Subrace)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Опір некротичній енергії', 'Ви маєте опір до некротичної шкоди.', 'Опір до некротичної шкоди', NULL, NULL, '{PASSIVE}', '2026-08-28 18:46:52.485', '2026-08-28 18:46:52.485', 'Necrotic Resistance (Shadar-kai Subrace)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Благословення Королеви Воронів', 'Бонусною дією ви можете магічно телепортуватися на відстань до 30 футів у вільний простір, який ви бачите. Ви можете використовувати цю рису кількість разів, що дорівнює вашому бонусу майстерності, і відновлюєте всі витрачені використання, коли закінчуєте довгий відпочинок.\n\nПочинаючи з 3-го рівня, ви також отримуєте опір до всіх видів шкоди, коли телепортуєтеся за допомогою цієї риси. Опір триває до початку вашого наступного ходу. Протягом цього часу ви виглядаєте примарним і напівпрозорим.', 'Телепорт 30 футів + опір до всієї шкоди (з 3-го рівня)', 'LONG_REST', NULL, '{BONUSACTION}', '2026-08-28 18:46:52.521', '2026-08-28 18:46:52.521', 'Blessing of the Raven Queen (Shadar-kai Subrace)', NULL, true, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Дварфська витривалість', 'Максимум ваших хіт-поінтів збільшується на 1, і він збільшується на 1 додатково щоразу, коли ви отримуєте рівень.', '+1 HP на рівень', NULL, NULL, '{PASSIVE}', '2026-08-28 18:46:52.914', '2026-08-28 18:46:52.914', 'Dwarven Toughness (Hill Dwarf Subrace)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Дварфське бронарське навчання', 'Ви володієте легкими та середніми обладунками.', 'Володіння легкими та середніми обладунками', NULL, NULL, '{PASSIVE}', '2026-08-28 18:46:52.95', '2026-08-28 18:46:52.95', 'Dwarven Armor Training (Mountain Dwarf Subrace)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Стійкість дуергара', 'Ви маєте перевагу на ряткидки проти ілюзій та проти того, щоб бути зачарованим або паралізованим.', 'Перевага на ряткидки проти ілюзій, зачарування та паралічу', NULL, NULL, '{PASSIVE}', '2026-08-28 18:46:53.027', '2026-08-28 18:46:53.027', 'Duergar Resilience (Duergar Subrace)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Магія дуергара', 'Коли ви досягаєте 3-го рівня, ви можете один раз використати заклинання <a href="/spell/1289">Збільшення/Зменшення [Enlarge/Reduce]</a> на себе. Коли ви досягаєте 5-го рівня, ви також можете один раз використати заклинання <a href="/spell/1276">Невидимість [Invisibility]</a> на себе. Після використання кожного з цих заклять ви не можете використовувати це заклинання знову, доки не завершите довгий відпочинок. Інтелект є вашою характеристикою для цих заклинань.', 'Збільшення/Зменшення та Невидимість (тільки на себе)', 'LONG_REST', NULL, '{PASSIVE}', '2026-08-28 18:46:53.064', '2026-08-28 18:46:53.064', 'Duergar Magic (Duergar Subrace)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Кам''яний камуфляж', 'Ви маєте перевагу на перевірки Спритності (Непомітність [Stealth]), щоб сховатися в кам''янистій місцевості.', 'Перевага на Непомітність у кам''янистій місцевості', NULL, NULL, '{PASSIVE}', '2026-08-28 18:46:54.683', '2026-08-28 18:46:54.683', 'Stone Camouflage (Deep Gnome Subrace)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Плащ тіней', 'Починаючи з 6 рівня, ви можете використати свій Виклик божественності, щоб зникнути.

Дією ви стаєте невидимими до кінця свого наступного ходу. Ви стаєте видимими, якщо атакуєте або накладаєте заклинання.', 'Дією стаєте невидимими до кінця свого наступного ходу; невидимість зникає, якщо атакуєте або накладаєте заклинання.', NULL, NULL, '{ACTION}', '2026-08-28 18:47:04.069', '2026-08-28 18:47:04.069', 'Cloak of Shadows (Trickery Domain)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', 'CHANNEL_DIVINITY', 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Божественність: Наведений удар', 'Починаючи з 2 рівня, ви можете використати свій Виклик божественності, щоб вражати з надприродною точністю. Коли ви робите кидок атаки, ви можете використати свій Виклик божественності, щоб отримати +10 до цього кидка. Ви робите цей вибір після того, як побачили результат кидка, але до того, як Майстер скаже, чи атака влучає чи промахується.', 'Коли робите кидок атаки, можете додати +10 до кидка.', NULL, NULL, '{PASSIVE}', '2026-08-28 18:47:04.592', '2026-08-28 18:47:04.592', 'Channel Divinity: Guided Strike (War Domain)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', 'CHANNEL_DIVINITY', 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Радіантна душа', 'Починаючи з 6 рівня, ви отримуєте опір радіантній шкоді. Крім того, коли ви накладаєте закляття, що завдає радіантної або вогняної шкоди, ви можете додати свій модифікатор Харизми до одного кидка шкоди цього закляття проти однієї з його цілей.', 'Опір радіантній шкоді; раз за хід додаєте мод. Харизми до шкоди заклять вогнем або світлом.', NULL, NULL, '{PASSIVE}', '2026-08-28 18:47:05.734', '2026-08-28 18:47:05.734', 'Radiant Soul (Celestial)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Перевертень', 'На 10 рівні ви додаєте закляття <a href="/spell/1189">Перевтілення [Polymorph]</a> до своєї книги заклять, якщо його там ще немає. Ви можете накласти <a href="/spell/1189">Перевтілення [Polymorph]</a>, не витрачаючи чарослот. Коли ви робите це, ви можете націлити лише себе і перетворитися на звіра з рейтингом небезпеки 1 або нижче.

      Після того як ви накладете <a href="/spell/1189">Перевтілення [Polymorph]</a> у цей спосіб, ви не можете зробити цього знову, доки не завершите короткий або тривалий відпочинок, хоча й надалі можете накладати це закляття звичайним способом, витрачаючи доступний чарослот.', 'Додаєте <a href="/spell/1189">Перевтілення [Polymorph]</a> до книги заклять, якщо його там немає; можете накласти його на себе без витрати чарослоту, але лише перетворюючись на звіра з КР 1 або нижче. 1/КВ або ТВ.', 'SHORT_REST', 1, '{PASSIVE}', '2026-08-28 18:47:10.601', '2026-08-28 18:47:10.601', 'Shapechanger (School of Transmutation)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

INSERT INTO feature (name, description, short_description, limited_uses_per, uses_count, display_type, created_at, updated_at, eng_name, uses_count_special, uses_count_depends_on_proficiency_bonus, modifies_ac, skill_proficiencies, saving_throws, languages_to_choose_count, skill_expertises, invocations_count, bonus_to_attack_roll, bonus_to_melee_damage, bonus_to_ranged_attack_roll, bonus_to_ranged_damage, bonus_to_saving_throws, gives_ac, gives_maneuvres, modified_unarmed, no_armor_or_shield_for_ac_bonus, superiority_dice_count, thrown_damage_boost, unarmed_damage, gives_con, gives_str, requires_armor_for_ac_bonus, bonus_to_melee_one_handed_weapon_damage, gives_languages, uses_pool_key, use_price, armor_proficiencies, weapon_proficiencies, weapon_proficiencies_special, tool_proficiencies, ruleset)
VALUES ('Божественність: Керований удар', 'Ви можете використати свій Виклик божественності, щоб завдати удару з надприродною точністю. Коли ви робите кидок атаки, ви можете додати +10 до цього кидка. Це рішення ви приймаєте після того, як побачили результат кидка, але до того, як Майстер підземелля скаже, влучає атака чи ні.', 'Коли робите кидок атаки, додаєте +10 до результату (можна після кидка, але до оголошення результату).', NULL, NULL, '{PASSIVE}', '2026-08-28 18:47:13.541', '2026-08-28 18:47:13.541', 'Channel Divinity: Guided Strike (Oath of Conquest)', NULL, false, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', 'CHANNEL_DIVINITY', 1, '{}', NULL, NULL, '{}', 'RULES_2014')
ON CONFLICT (eng_name) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    limited_uses_per = EXCLUDED.limited_uses_per,
    uses_count = EXCLUDED.uses_count,
    display_type = EXCLUDED.display_type,
    updated_at = EXCLUDED.updated_at,
    uses_count_special = EXCLUDED.uses_count_special,
    uses_count_depends_on_proficiency_bonus = EXCLUDED.uses_count_depends_on_proficiency_bonus,
    modifies_ac = EXCLUDED.modifies_ac,
    skill_proficiencies = EXCLUDED.skill_proficiencies,
    saving_throws = EXCLUDED.saving_throws,
    languages_to_choose_count = EXCLUDED.languages_to_choose_count,
    skill_expertises = EXCLUDED.skill_expertises,
    invocations_count = EXCLUDED.invocations_count,
    bonus_to_attack_roll = EXCLUDED.bonus_to_attack_roll,
    bonus_to_melee_damage = EXCLUDED.bonus_to_melee_damage,
    bonus_to_ranged_attack_roll = EXCLUDED.bonus_to_ranged_attack_roll,
    bonus_to_ranged_damage = EXCLUDED.bonus_to_ranged_damage,
    bonus_to_saving_throws = EXCLUDED.bonus_to_saving_throws,
    gives_ac = EXCLUDED.gives_ac,
    gives_maneuvres = EXCLUDED.gives_maneuvres,
    modified_unarmed = EXCLUDED.modified_unarmed,
    no_armor_or_shield_for_ac_bonus = EXCLUDED.no_armor_or_shield_for_ac_bonus,
    superiority_dice_count = EXCLUDED.superiority_dice_count,
    thrown_damage_boost = EXCLUDED.thrown_damage_boost,
    unarmed_damage = EXCLUDED.unarmed_damage,
    gives_con = EXCLUDED.gives_con,
    gives_str = EXCLUDED.gives_str,
    requires_armor_for_ac_bonus = EXCLUDED.requires_armor_for_ac_bonus,
    bonus_to_melee_one_handed_weapon_damage = EXCLUDED.bonus_to_melee_one_handed_weapon_damage,
    gives_languages = EXCLUDED.gives_languages,
    uses_pool_key = EXCLUDED.uses_pool_key,
    use_price = EXCLUDED.use_price,
    armor_proficiencies = EXCLUDED.armor_proficiencies,
    weapon_proficiencies = EXCLUDED.weapon_proficiencies,
    weapon_proficiencies_special = EXCLUDED.weapon_proficiencies_special,
    tool_proficiencies = EXCLUDED.tool_proficiencies,
    ruleset = EXCLUDED.ruleset;

-- ── 2. Перевішування власників ───────────────────────────────────────────────

-- Psychic Blades → Psychic Blades (College of Whispers) (subclass COLLEGE_OF_WHISPERS)
DELETE FROM subclass_feature t
 USING subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'COLLEGE_OF_WHISPERS'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Psychic Blades'
   AND nf.eng_name = 'Psychic Blades (College of Whispers)'
   AND EXISTS (SELECT 1 FROM subclass_feature kept
                WHERE kept.subclass_id = t.subclass_id AND kept.feature_id = nf.feature_id);

UPDATE subclass_feature t
   SET feature_id = nf.feature_id
  FROM subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'COLLEGE_OF_WHISPERS'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Psychic Blades'
   AND nf.eng_name = 'Psychic Blades (College of Whispers)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'COLLEGE_OF_WHISPERS')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Psychic Blades'
   AND nf.eng_name = 'Psychic Blades (College of Whispers)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'COLLEGE_OF_WHISPERS')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Psychic Blades'
   AND nf.eng_name = 'Psychic Blades (College of Whispers)';

-- Psychic Blades → Psychic Blades (Soulknife) (subclass SOULKNIFE)
DELETE FROM subclass_feature t
 USING subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'SOULKNIFE'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Psychic Blades'
   AND nf.eng_name = 'Psychic Blades (Soulknife)'
   AND EXISTS (SELECT 1 FROM subclass_feature kept
                WHERE kept.subclass_id = t.subclass_id AND kept.feature_id = nf.feature_id);

UPDATE subclass_feature t
   SET feature_id = nf.feature_id
  FROM subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'SOULKNIFE'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Psychic Blades'
   AND nf.eng_name = 'Psychic Blades (Soulknife)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'SOULKNIFE')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Psychic Blades'
   AND nf.eng_name = 'Psychic Blades (Soulknife)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'SOULKNIFE')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Psychic Blades'
   AND nf.eng_name = 'Psychic Blades (Soulknife)';

-- Psionic Power → Psionic Power (Psi Warrior) (subclass PSI_WARRIOR)
DELETE FROM subclass_feature t
 USING subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'PSI_WARRIOR'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Psionic Power'
   AND nf.eng_name = 'Psionic Power (Psi Warrior)'
   AND EXISTS (SELECT 1 FROM subclass_feature kept
                WHERE kept.subclass_id = t.subclass_id AND kept.feature_id = nf.feature_id);

UPDATE subclass_feature t
   SET feature_id = nf.feature_id
  FROM subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'PSI_WARRIOR'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Psionic Power'
   AND nf.eng_name = 'Psionic Power (Psi Warrior)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'PSI_WARRIOR')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Psionic Power'
   AND nf.eng_name = 'Psionic Power (Psi Warrior)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'PSI_WARRIOR')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Psionic Power'
   AND nf.eng_name = 'Psionic Power (Psi Warrior)';

-- Psionic Power → Psionic Power (Soulknife) (subclass SOULKNIFE)
DELETE FROM subclass_feature t
 USING subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'SOULKNIFE'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Psionic Power'
   AND nf.eng_name = 'Psionic Power (Soulknife)'
   AND EXISTS (SELECT 1 FROM subclass_feature kept
                WHERE kept.subclass_id = t.subclass_id AND kept.feature_id = nf.feature_id);

UPDATE subclass_feature t
   SET feature_id = nf.feature_id
  FROM subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'SOULKNIFE'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Psionic Power'
   AND nf.eng_name = 'Psionic Power (Soulknife)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'SOULKNIFE')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Psionic Power'
   AND nf.eng_name = 'Psionic Power (Soulknife)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'SOULKNIFE')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Psionic Power'
   AND nf.eng_name = 'Psionic Power (Soulknife)';

-- Cloak of Shadows → Cloak of Shadows (Trickery Domain) (subclass TRICKERY_DOMAIN)
DELETE FROM subclass_feature t
 USING subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'TRICKERY_DOMAIN'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Cloak of Shadows'
   AND nf.eng_name = 'Cloak of Shadows (Trickery Domain)'
   AND EXISTS (SELECT 1 FROM subclass_feature kept
                WHERE kept.subclass_id = t.subclass_id AND kept.feature_id = nf.feature_id);

UPDATE subclass_feature t
   SET feature_id = nf.feature_id
  FROM subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'TRICKERY_DOMAIN'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Cloak of Shadows'
   AND nf.eng_name = 'Cloak of Shadows (Trickery Domain)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'TRICKERY_DOMAIN')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Cloak of Shadows'
   AND nf.eng_name = 'Cloak of Shadows (Trickery Domain)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'TRICKERY_DOMAIN')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Cloak of Shadows'
   AND nf.eng_name = 'Cloak of Shadows (Trickery Domain)';

-- Cloak of Shadows → Cloak of Shadows (Way of Shadow) (subclass WAY_OF_SHADOW)
DELETE FROM subclass_feature t
 USING subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'WAY_OF_SHADOW'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Cloak of Shadows'
   AND nf.eng_name = 'Cloak of Shadows (Way of Shadow)'
   AND EXISTS (SELECT 1 FROM subclass_feature kept
                WHERE kept.subclass_id = t.subclass_id AND kept.feature_id = nf.feature_id);

UPDATE subclass_feature t
   SET feature_id = nf.feature_id
  FROM subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'WAY_OF_SHADOW'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Cloak of Shadows'
   AND nf.eng_name = 'Cloak of Shadows (Way of Shadow)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'WAY_OF_SHADOW')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Cloak of Shadows'
   AND nf.eng_name = 'Cloak of Shadows (Way of Shadow)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'WAY_OF_SHADOW')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Cloak of Shadows'
   AND nf.eng_name = 'Cloak of Shadows (Way of Shadow)';

-- Channel Divinity: Guided Strike → Channel Divinity: Guided Strike (War Domain) (subclass WAR_DOMAIN)
DELETE FROM subclass_feature t
 USING subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'WAR_DOMAIN'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Channel Divinity: Guided Strike'
   AND nf.eng_name = 'Channel Divinity: Guided Strike (War Domain)'
   AND EXISTS (SELECT 1 FROM subclass_feature kept
                WHERE kept.subclass_id = t.subclass_id AND kept.feature_id = nf.feature_id);

UPDATE subclass_feature t
   SET feature_id = nf.feature_id
  FROM subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'WAR_DOMAIN'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Channel Divinity: Guided Strike'
   AND nf.eng_name = 'Channel Divinity: Guided Strike (War Domain)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'WAR_DOMAIN')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Channel Divinity: Guided Strike'
   AND nf.eng_name = 'Channel Divinity: Guided Strike (War Domain)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'WAR_DOMAIN')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Channel Divinity: Guided Strike'
   AND nf.eng_name = 'Channel Divinity: Guided Strike (War Domain)';

-- Channel Divinity: Guided Strike → Channel Divinity: Guided Strike (Oath of Conquest) (subclass OATH_OF_CONQUEST)
DELETE FROM subclass_feature t
 USING subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'OATH_OF_CONQUEST'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Channel Divinity: Guided Strike'
   AND nf.eng_name = 'Channel Divinity: Guided Strike (Oath of Conquest)'
   AND EXISTS (SELECT 1 FROM subclass_feature kept
                WHERE kept.subclass_id = t.subclass_id AND kept.feature_id = nf.feature_id);

UPDATE subclass_feature t
   SET feature_id = nf.feature_id
  FROM subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'OATH_OF_CONQUEST'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Channel Divinity: Guided Strike'
   AND nf.eng_name = 'Channel Divinity: Guided Strike (Oath of Conquest)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'OATH_OF_CONQUEST')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Channel Divinity: Guided Strike'
   AND nf.eng_name = 'Channel Divinity: Guided Strike (Oath of Conquest)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'OATH_OF_CONQUEST')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Channel Divinity: Guided Strike'
   AND nf.eng_name = 'Channel Divinity: Guided Strike (Oath of Conquest)';

-- Radiant Soul → Radiant Soul (Celestial) (subclass CELESTIAL)
DELETE FROM subclass_feature t
 USING subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'CELESTIAL'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Radiant Soul'
   AND nf.eng_name = 'Radiant Soul (Celestial)'
   AND EXISTS (SELECT 1 FROM subclass_feature kept
                WHERE kept.subclass_id = t.subclass_id AND kept.feature_id = nf.feature_id);

UPDATE subclass_feature t
   SET feature_id = nf.feature_id
  FROM subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'CELESTIAL'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Radiant Soul'
   AND nf.eng_name = 'Radiant Soul (Celestial)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'CELESTIAL')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Radiant Soul'
   AND nf.eng_name = 'Radiant Soul (Celestial)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'CELESTIAL')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Radiant Soul'
   AND nf.eng_name = 'Radiant Soul (Celestial)';

-- Shapechanger → Shapechanger (School of Transmutation) (subclass SCHOOL_OF_TRANSMUTATION)
DELETE FROM subclass_feature t
 USING subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'SCHOOL_OF_TRANSMUTATION'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Shapechanger'
   AND nf.eng_name = 'Shapechanger (School of Transmutation)'
   AND EXISTS (SELECT 1 FROM subclass_feature kept
                WHERE kept.subclass_id = t.subclass_id AND kept.feature_id = nf.feature_id);

UPDATE subclass_feature t
   SET feature_id = nf.feature_id
  FROM subclass o, feature old, feature nf
 WHERE t.subclass_id = o.subclass_id AND o.name = 'SCHOOL_OF_TRANSMUTATION'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Shapechanger'
   AND nf.eng_name = 'Shapechanger (School of Transmutation)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'SCHOOL_OF_TRANSMUTATION')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Shapechanger'
   AND nf.eng_name = 'Shapechanger (School of Transmutation)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subclass_id IN (SELECT subclass_id FROM subclass WHERE name = 'SCHOOL_OF_TRANSMUTATION')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Shapechanger'
   AND nf.eng_name = 'Shapechanger (School of Transmutation)';

-- Shapechanger → Shapechanger (Changeling) (race CHANGELING_MPMM)
DELETE FROM race_trait t
 USING race o, feature old, feature nf
 WHERE t.race_id = o.race_id AND o.name = 'CHANGELING_MPMM'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Shapechanger'
   AND nf.eng_name = 'Shapechanger (Changeling)'
   AND EXISTS (SELECT 1 FROM race_trait kept
                WHERE kept.race_id = t.race_id AND kept.feature_id = nf.feature_id);

UPDATE race_trait t
   SET feature_id = nf.feature_id
  FROM race o, feature old, feature nf
 WHERE t.race_id = o.race_id AND o.name = 'CHANGELING_MPMM'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Shapechanger'
   AND nf.eng_name = 'Shapechanger (Changeling)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.race_id IN (SELECT race_id FROM race WHERE name = 'CHANGELING_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Shapechanger'
   AND nf.eng_name = 'Shapechanger (Changeling)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.race_id IN (SELECT race_id FROM race WHERE name = 'CHANGELING_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Shapechanger'
   AND nf.eng_name = 'Shapechanger (Changeling)';

-- Child of the Sea → Child of the Sea (Sea Elf Race) (race SEA_ELF_MPMM)
DELETE FROM race_trait t
 USING race o, feature old, feature nf
 WHERE t.race_id = o.race_id AND o.name = 'SEA_ELF_MPMM'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Child of the Sea'
   AND nf.eng_name = 'Child of the Sea (Sea Elf Race)'
   AND EXISTS (SELECT 1 FROM race_trait kept
                WHERE kept.race_id = t.race_id AND kept.feature_id = nf.feature_id);

UPDATE race_trait t
   SET feature_id = nf.feature_id
  FROM race o, feature old, feature nf
 WHERE t.race_id = o.race_id AND o.name = 'SEA_ELF_MPMM'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Child of the Sea'
   AND nf.eng_name = 'Child of the Sea (Sea Elf Race)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.race_id IN (SELECT race_id FROM race WHERE name = 'SEA_ELF_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Child of the Sea'
   AND nf.eng_name = 'Child of the Sea (Sea Elf Race)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.race_id IN (SELECT race_id FROM race WHERE name = 'SEA_ELF_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Child of the Sea'
   AND nf.eng_name = 'Child of the Sea (Sea Elf Race)';

-- Friend of the Sea → Friend of the Sea (Sea Elf Race) (race SEA_ELF_MPMM)
DELETE FROM race_trait t
 USING race o, feature old, feature nf
 WHERE t.race_id = o.race_id AND o.name = 'SEA_ELF_MPMM'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Friend of the Sea'
   AND nf.eng_name = 'Friend of the Sea (Sea Elf Race)'
   AND EXISTS (SELECT 1 FROM race_trait kept
                WHERE kept.race_id = t.race_id AND kept.feature_id = nf.feature_id);

UPDATE race_trait t
   SET feature_id = nf.feature_id
  FROM race o, feature old, feature nf
 WHERE t.race_id = o.race_id AND o.name = 'SEA_ELF_MPMM'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Friend of the Sea'
   AND nf.eng_name = 'Friend of the Sea (Sea Elf Race)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.race_id IN (SELECT race_id FROM race WHERE name = 'SEA_ELF_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Friend of the Sea'
   AND nf.eng_name = 'Friend of the Sea (Sea Elf Race)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.race_id IN (SELECT race_id FROM race WHERE name = 'SEA_ELF_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Friend of the Sea'
   AND nf.eng_name = 'Friend of the Sea (Sea Elf Race)';

-- Duergar Magic → Duergar Magic (Duergar Race) (race DUERGAR_MPMM)
DELETE FROM race_trait t
 USING race o, feature old, feature nf
 WHERE t.race_id = o.race_id AND o.name = 'DUERGAR_MPMM'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Duergar Magic'
   AND nf.eng_name = 'Duergar Magic (Duergar Race)'
   AND EXISTS (SELECT 1 FROM race_trait kept
                WHERE kept.race_id = t.race_id AND kept.feature_id = nf.feature_id);

UPDATE race_trait t
   SET feature_id = nf.feature_id
  FROM race o, feature old, feature nf
 WHERE t.race_id = o.race_id AND o.name = 'DUERGAR_MPMM'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Duergar Magic'
   AND nf.eng_name = 'Duergar Magic (Duergar Race)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.race_id IN (SELECT race_id FROM race WHERE name = 'DUERGAR_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Duergar Magic'
   AND nf.eng_name = 'Duergar Magic (Duergar Race)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.race_id IN (SELECT race_id FROM race WHERE name = 'DUERGAR_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Duergar Magic'
   AND nf.eng_name = 'Duergar Magic (Duergar Race)';

-- Duergar Resilience → Duergar Resilience (Duergar Race) (race DUERGAR_MPMM)
DELETE FROM race_trait t
 USING race o, feature old, feature nf
 WHERE t.race_id = o.race_id AND o.name = 'DUERGAR_MPMM'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Duergar Resilience'
   AND nf.eng_name = 'Duergar Resilience (Duergar Race)'
   AND EXISTS (SELECT 1 FROM race_trait kept
                WHERE kept.race_id = t.race_id AND kept.feature_id = nf.feature_id);

UPDATE race_trait t
   SET feature_id = nf.feature_id
  FROM race o, feature old, feature nf
 WHERE t.race_id = o.race_id AND o.name = 'DUERGAR_MPMM'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Duergar Resilience'
   AND nf.eng_name = 'Duergar Resilience (Duergar Race)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.race_id IN (SELECT race_id FROM race WHERE name = 'DUERGAR_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Duergar Resilience'
   AND nf.eng_name = 'Duergar Resilience (Duergar Race)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.race_id IN (SELECT race_id FROM race WHERE name = 'DUERGAR_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Duergar Resilience'
   AND nf.eng_name = 'Duergar Resilience (Duergar Race)';

-- Blessing of the Raven Queen → Blessing of the Raven Queen (Shadar-kai Race) (race SHADAR_KAI_MPMM)
DELETE FROM race_trait t
 USING race o, feature old, feature nf
 WHERE t.race_id = o.race_id AND o.name = 'SHADAR_KAI_MPMM'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Blessing of the Raven Queen'
   AND nf.eng_name = 'Blessing of the Raven Queen (Shadar-kai Race)'
   AND EXISTS (SELECT 1 FROM race_trait kept
                WHERE kept.race_id = t.race_id AND kept.feature_id = nf.feature_id);

UPDATE race_trait t
   SET feature_id = nf.feature_id
  FROM race o, feature old, feature nf
 WHERE t.race_id = o.race_id AND o.name = 'SHADAR_KAI_MPMM'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Blessing of the Raven Queen'
   AND nf.eng_name = 'Blessing of the Raven Queen (Shadar-kai Race)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.race_id IN (SELECT race_id FROM race WHERE name = 'SHADAR_KAI_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Blessing of the Raven Queen'
   AND nf.eng_name = 'Blessing of the Raven Queen (Shadar-kai Race)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.race_id IN (SELECT race_id FROM race WHERE name = 'SHADAR_KAI_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Blessing of the Raven Queen'
   AND nf.eng_name = 'Blessing of the Raven Queen (Shadar-kai Race)';

-- Necrotic Resistance → Necrotic Resistance (Shadar-kai Race) (race SHADAR_KAI_MPMM)
DELETE FROM race_trait t
 USING race o, feature old, feature nf
 WHERE t.race_id = o.race_id AND o.name = 'SHADAR_KAI_MPMM'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Necrotic Resistance'
   AND nf.eng_name = 'Necrotic Resistance (Shadar-kai Race)'
   AND EXISTS (SELECT 1 FROM race_trait kept
                WHERE kept.race_id = t.race_id AND kept.feature_id = nf.feature_id);

UPDATE race_trait t
   SET feature_id = nf.feature_id
  FROM race o, feature old, feature nf
 WHERE t.race_id = o.race_id AND o.name = 'SHADAR_KAI_MPMM'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Necrotic Resistance'
   AND nf.eng_name = 'Necrotic Resistance (Shadar-kai Race)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.race_id IN (SELECT race_id FROM race WHERE name = 'SHADAR_KAI_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Necrotic Resistance'
   AND nf.eng_name = 'Necrotic Resistance (Shadar-kai Race)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.race_id IN (SELECT race_id FROM race WHERE name = 'SHADAR_KAI_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Necrotic Resistance'
   AND nf.eng_name = 'Necrotic Resistance (Shadar-kai Race)';

-- Child of the Sea → Child of the Sea (Sea Elf Subrace) (subrace ELF_SEA_MTOF)
DELETE FROM subrace_trait t
 USING subrace o, feature old, feature nf
 WHERE t.subrace_id = o.subrace_id AND o.name = 'ELF_SEA_MTOF'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Child of the Sea'
   AND nf.eng_name = 'Child of the Sea (Sea Elf Subrace)'
   AND EXISTS (SELECT 1 FROM subrace_trait kept
                WHERE kept.subrace_id = t.subrace_id AND kept.feature_id = nf.feature_id);

UPDATE subrace_trait t
   SET feature_id = nf.feature_id
  FROM subrace o, feature old, feature nf
 WHERE t.subrace_id = o.subrace_id AND o.name = 'ELF_SEA_MTOF'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Child of the Sea'
   AND nf.eng_name = 'Child of the Sea (Sea Elf Subrace)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subrace_id IN (SELECT subrace_id FROM subrace WHERE name = 'ELF_SEA_MTOF')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Child of the Sea'
   AND nf.eng_name = 'Child of the Sea (Sea Elf Subrace)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subrace_id IN (SELECT subrace_id FROM subrace WHERE name = 'ELF_SEA_MTOF')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Child of the Sea'
   AND nf.eng_name = 'Child of the Sea (Sea Elf Subrace)';

-- Friend of the Sea → Friend of the Sea (Sea Elf Subrace) (subrace ELF_SEA_MTOF)
DELETE FROM subrace_trait t
 USING subrace o, feature old, feature nf
 WHERE t.subrace_id = o.subrace_id AND o.name = 'ELF_SEA_MTOF'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Friend of the Sea'
   AND nf.eng_name = 'Friend of the Sea (Sea Elf Subrace)'
   AND EXISTS (SELECT 1 FROM subrace_trait kept
                WHERE kept.subrace_id = t.subrace_id AND kept.feature_id = nf.feature_id);

UPDATE subrace_trait t
   SET feature_id = nf.feature_id
  FROM subrace o, feature old, feature nf
 WHERE t.subrace_id = o.subrace_id AND o.name = 'ELF_SEA_MTOF'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Friend of the Sea'
   AND nf.eng_name = 'Friend of the Sea (Sea Elf Subrace)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subrace_id IN (SELECT subrace_id FROM subrace WHERE name = 'ELF_SEA_MTOF')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Friend of the Sea'
   AND nf.eng_name = 'Friend of the Sea (Sea Elf Subrace)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subrace_id IN (SELECT subrace_id FROM subrace WHERE name = 'ELF_SEA_MTOF')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Friend of the Sea'
   AND nf.eng_name = 'Friend of the Sea (Sea Elf Subrace)';

-- Blessing of the Raven Queen → Blessing of the Raven Queen (Shadar-kai Subrace) (subrace ELF_SHADAR_KAI_MPMM)
DELETE FROM subrace_trait t
 USING subrace o, feature old, feature nf
 WHERE t.subrace_id = o.subrace_id AND o.name = 'ELF_SHADAR_KAI_MPMM'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Blessing of the Raven Queen'
   AND nf.eng_name = 'Blessing of the Raven Queen (Shadar-kai Subrace)'
   AND EXISTS (SELECT 1 FROM subrace_trait kept
                WHERE kept.subrace_id = t.subrace_id AND kept.feature_id = nf.feature_id);

UPDATE subrace_trait t
   SET feature_id = nf.feature_id
  FROM subrace o, feature old, feature nf
 WHERE t.subrace_id = o.subrace_id AND o.name = 'ELF_SHADAR_KAI_MPMM'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Blessing of the Raven Queen'
   AND nf.eng_name = 'Blessing of the Raven Queen (Shadar-kai Subrace)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subrace_id IN (SELECT subrace_id FROM subrace WHERE name = 'ELF_SHADAR_KAI_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Blessing of the Raven Queen'
   AND nf.eng_name = 'Blessing of the Raven Queen (Shadar-kai Subrace)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subrace_id IN (SELECT subrace_id FROM subrace WHERE name = 'ELF_SHADAR_KAI_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Blessing of the Raven Queen'
   AND nf.eng_name = 'Blessing of the Raven Queen (Shadar-kai Subrace)';

-- Necrotic Resistance → Necrotic Resistance (Shadar-kai Subrace) (subrace ELF_SHADAR_KAI_MPMM)
DELETE FROM subrace_trait t
 USING subrace o, feature old, feature nf
 WHERE t.subrace_id = o.subrace_id AND o.name = 'ELF_SHADAR_KAI_MPMM'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Necrotic Resistance'
   AND nf.eng_name = 'Necrotic Resistance (Shadar-kai Subrace)'
   AND EXISTS (SELECT 1 FROM subrace_trait kept
                WHERE kept.subrace_id = t.subrace_id AND kept.feature_id = nf.feature_id);

UPDATE subrace_trait t
   SET feature_id = nf.feature_id
  FROM subrace o, feature old, feature nf
 WHERE t.subrace_id = o.subrace_id AND o.name = 'ELF_SHADAR_KAI_MPMM'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Necrotic Resistance'
   AND nf.eng_name = 'Necrotic Resistance (Shadar-kai Subrace)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subrace_id IN (SELECT subrace_id FROM subrace WHERE name = 'ELF_SHADAR_KAI_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Necrotic Resistance'
   AND nf.eng_name = 'Necrotic Resistance (Shadar-kai Subrace)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subrace_id IN (SELECT subrace_id FROM subrace WHERE name = 'ELF_SHADAR_KAI_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Necrotic Resistance'
   AND nf.eng_name = 'Necrotic Resistance (Shadar-kai Subrace)';

-- Duergar Magic → Duergar Magic (Duergar Subrace) (subrace DWARF_DUERGAR_GRAY_SCAG)
DELETE FROM subrace_trait t
 USING subrace o, feature old, feature nf
 WHERE t.subrace_id = o.subrace_id AND o.name = 'DWARF_DUERGAR_GRAY_SCAG'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Duergar Magic'
   AND nf.eng_name = 'Duergar Magic (Duergar Subrace)'
   AND EXISTS (SELECT 1 FROM subrace_trait kept
                WHERE kept.subrace_id = t.subrace_id AND kept.feature_id = nf.feature_id);

UPDATE subrace_trait t
   SET feature_id = nf.feature_id
  FROM subrace o, feature old, feature nf
 WHERE t.subrace_id = o.subrace_id AND o.name = 'DWARF_DUERGAR_GRAY_SCAG'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Duergar Magic'
   AND nf.eng_name = 'Duergar Magic (Duergar Subrace)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subrace_id IN (SELECT subrace_id FROM subrace WHERE name = 'DWARF_DUERGAR_GRAY_SCAG')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Duergar Magic'
   AND nf.eng_name = 'Duergar Magic (Duergar Subrace)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subrace_id IN (SELECT subrace_id FROM subrace WHERE name = 'DWARF_DUERGAR_GRAY_SCAG')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Duergar Magic'
   AND nf.eng_name = 'Duergar Magic (Duergar Subrace)';

-- Duergar Resilience → Duergar Resilience (Duergar Subrace) (subrace DWARF_DUERGAR_GRAY_SCAG)
DELETE FROM subrace_trait t
 USING subrace o, feature old, feature nf
 WHERE t.subrace_id = o.subrace_id AND o.name = 'DWARF_DUERGAR_GRAY_SCAG'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Duergar Resilience'
   AND nf.eng_name = 'Duergar Resilience (Duergar Subrace)'
   AND EXISTS (SELECT 1 FROM subrace_trait kept
                WHERE kept.subrace_id = t.subrace_id AND kept.feature_id = nf.feature_id);

UPDATE subrace_trait t
   SET feature_id = nf.feature_id
  FROM subrace o, feature old, feature nf
 WHERE t.subrace_id = o.subrace_id AND o.name = 'DWARF_DUERGAR_GRAY_SCAG'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Duergar Resilience'
   AND nf.eng_name = 'Duergar Resilience (Duergar Subrace)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subrace_id IN (SELECT subrace_id FROM subrace WHERE name = 'DWARF_DUERGAR_GRAY_SCAG')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Duergar Resilience'
   AND nf.eng_name = 'Duergar Resilience (Duergar Subrace)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subrace_id IN (SELECT subrace_id FROM subrace WHERE name = 'DWARF_DUERGAR_GRAY_SCAG')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Duergar Resilience'
   AND nf.eng_name = 'Duergar Resilience (Duergar Subrace)';

-- Dwarven Toughness → Dwarven Toughness (Hill Dwarf Subrace) (subrace DWARF_HILL_2014)
DELETE FROM subrace_trait t
 USING subrace o, feature old, feature nf
 WHERE t.subrace_id = o.subrace_id AND o.name = 'DWARF_HILL_2014'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Dwarven Toughness'
   AND nf.eng_name = 'Dwarven Toughness (Hill Dwarf Subrace)'
   AND EXISTS (SELECT 1 FROM subrace_trait kept
                WHERE kept.subrace_id = t.subrace_id AND kept.feature_id = nf.feature_id);

UPDATE subrace_trait t
   SET feature_id = nf.feature_id
  FROM subrace o, feature old, feature nf
 WHERE t.subrace_id = o.subrace_id AND o.name = 'DWARF_HILL_2014'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Dwarven Toughness'
   AND nf.eng_name = 'Dwarven Toughness (Hill Dwarf Subrace)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subrace_id IN (SELECT subrace_id FROM subrace WHERE name = 'DWARF_HILL_2014')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Dwarven Toughness'
   AND nf.eng_name = 'Dwarven Toughness (Hill Dwarf Subrace)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subrace_id IN (SELECT subrace_id FROM subrace WHERE name = 'DWARF_HILL_2014')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Dwarven Toughness'
   AND nf.eng_name = 'Dwarven Toughness (Hill Dwarf Subrace)';

-- Dwarven Armor Training → Dwarven Armor Training (Mountain Dwarf Subrace) (subrace DWARF_MOUNTAIN_2014)
DELETE FROM subrace_trait t
 USING subrace o, feature old, feature nf
 WHERE t.subrace_id = o.subrace_id AND o.name = 'DWARF_MOUNTAIN_2014'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Dwarven Armor Training'
   AND nf.eng_name = 'Dwarven Armor Training (Mountain Dwarf Subrace)'
   AND EXISTS (SELECT 1 FROM subrace_trait kept
                WHERE kept.subrace_id = t.subrace_id AND kept.feature_id = nf.feature_id);

UPDATE subrace_trait t
   SET feature_id = nf.feature_id
  FROM subrace o, feature old, feature nf
 WHERE t.subrace_id = o.subrace_id AND o.name = 'DWARF_MOUNTAIN_2014'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Dwarven Armor Training'
   AND nf.eng_name = 'Dwarven Armor Training (Mountain Dwarf Subrace)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subrace_id IN (SELECT subrace_id FROM subrace WHERE name = 'DWARF_MOUNTAIN_2014')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Dwarven Armor Training'
   AND nf.eng_name = 'Dwarven Armor Training (Mountain Dwarf Subrace)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subrace_id IN (SELECT subrace_id FROM subrace WHERE name = 'DWARF_MOUNTAIN_2014')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Dwarven Armor Training'
   AND nf.eng_name = 'Dwarven Armor Training (Mountain Dwarf Subrace)';

-- Stone Camouflage → Stone Camouflage (Deep Gnome Subrace) (subrace GNOME_DEEP_SCAG)
DELETE FROM subrace_trait t
 USING subrace o, feature old, feature nf
 WHERE t.subrace_id = o.subrace_id AND o.name = 'GNOME_DEEP_SCAG'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Stone Camouflage'
   AND nf.eng_name = 'Stone Camouflage (Deep Gnome Subrace)'
   AND EXISTS (SELECT 1 FROM subrace_trait kept
                WHERE kept.subrace_id = t.subrace_id AND kept.feature_id = nf.feature_id);

UPDATE subrace_trait t
   SET feature_id = nf.feature_id
  FROM subrace o, feature old, feature nf
 WHERE t.subrace_id = o.subrace_id AND o.name = 'GNOME_DEEP_SCAG'
   AND t.feature_id = old.feature_id AND old.eng_name = 'Stone Camouflage'
   AND nf.eng_name = 'Stone Camouflage (Deep Gnome Subrace)';

DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subrace_id IN (SELECT subrace_id FROM subrace WHERE name = 'GNOME_DEEP_SCAG')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Stone Camouflage'
   AND nf.eng_name = 'Stone Camouflage (Deep Gnome Subrace)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.subrace_id IN (SELECT subrace_id FROM subrace WHERE name = 'GNOME_DEEP_SCAG')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Stone Camouflage'
   AND nf.eng_name = 'Stone Camouflage (Deep Gnome Subrace)';

-- Child of the Sea → Child of the Sea (Sea Elf Subrace): риса всередині вибору раси
UPDATE race_choice_option_trait t
   SET feature_id = nf.feature_id
  FROM feature nf, feature old
 WHERE nf.eng_name = 'Child of the Sea (Sea Elf Subrace)'
   AND old.eng_name = 'Child of the Sea'
   AND t.feature_id = old.feature_id;

-- Radiant Soul → Radiant Soul (Aasimar): риса всередині вибору раси
UPDATE race_choice_option_trait t
   SET feature_id = nf.feature_id
  FROM feature nf, feature old
 WHERE nf.eng_name = 'Radiant Soul (Aasimar)'
   AND old.eng_name = 'Radiant Soul'
   AND t.feature_id = old.feature_id;


-- ── 2b. Персонажі, яким риса дісталася через вибір раси ──────────────────────
--
-- Ці дві риси видаються не расою й не підкласом, а опцією вибору: Напівельф бере
-- «Швидкість плавання», Аасімар — «Небесне одкровення». Тому в таких персонажів pers_feature
-- вказує на злитий рядок, а жодне правило вище їх не зачіпає. Саме на цьому скрипт упав на
-- робочій базі 2026-08-28: гейт унизу побачив живі посилання й відкотив транзакцію.

-- Напівельф із «Швидкістю плавання» → Child of the Sea (Sea Elf Subrace)
DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.race_id IN (SELECT race_id FROM race WHERE name = 'HALF_ELF_2014')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Child of the Sea'
   AND nf.eng_name = 'Child of the Sea (Sea Elf Subrace)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.race_id IN (SELECT race_id FROM race WHERE name = 'HALF_ELF_2014')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Child of the Sea'
   AND nf.eng_name = 'Child of the Sea (Sea Elf Subrace)';

-- Аасімар із «Небесним одкровенням» → Radiant Soul (Aasimar)
DELETE FROM pers_feature pf
 USING pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.race_id IN (SELECT race_id FROM race WHERE name = 'AASIMAR_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Radiant Soul'
   AND nf.eng_name = 'Radiant Soul (Aasimar)'
   AND EXISTS (SELECT 1 FROM pers_feature kept WHERE kept.pers_id = pf.pers_id AND kept.feature_id = nf.feature_id);

UPDATE pers_feature pf
   SET feature_id = nf.feature_id
  FROM pers p, feature old, feature nf
 WHERE pf.pers_id = p.pers_id
   AND p.race_id IN (SELECT race_id FROM race WHERE name = 'AASIMAR_MPMM')
   AND pf.feature_id = old.feature_id AND old.eng_name = 'Radiant Soul'
   AND nf.eng_name = 'Radiant Soul (Aasimar)';

-- ── 3. Прибрати старі злиті рядки ────────────────────────────────────────────

DO $$
DECLARE
  stuck text;
BEGIN
  SELECT string_agg(format('%s — subclass_feature:%s race_trait:%s subrace_trait:%s race_choice_option_trait:%s pers_feature:%s',
                            f.eng_name,
                            (SELECT count(*) FROM subclass_feature x WHERE x.feature_id = f.feature_id),
                            (SELECT count(*) FROM race_trait x WHERE x.feature_id = f.feature_id),
                            (SELECT count(*) FROM subrace_trait x WHERE x.feature_id = f.feature_id),
                            (SELECT count(*) FROM race_choice_option_trait x WHERE x.feature_id = f.feature_id),
                            (SELECT count(*) FROM pers_feature x WHERE x.feature_id = f.feature_id)), E'\n  ')
    INTO stuck
    FROM feature f
   WHERE f.eng_name IN (
  'Blessing of the Raven Queen',
  'Channel Divinity: Guided Strike',
  'Child of the Sea',
  'Cloak of Shadows',
  'Duergar Magic',
  'Duergar Resilience',
  'Dwarven Armor Training',
  'Dwarven Toughness',
  'Friend of the Sea',
  'Necrotic Resistance',
  'Psionic Power',
  'Psychic Blades',
  'Radiant Soul',
  'Shapechanger',
  'Stone Camouflage'
     )
     AND ((SELECT count(*) FROM subclass_feature x WHERE x.feature_id = f.feature_id)
        + (SELECT count(*) FROM race_trait x WHERE x.feature_id = f.feature_id)
        + (SELECT count(*) FROM subrace_trait x WHERE x.feature_id = f.feature_id)
        + (SELECT count(*) FROM race_choice_option_trait x WHERE x.feature_id = f.feature_id)
        + (SELECT count(*) FROM pers_feature x WHERE x.feature_id = f.feature_id)) > 0;

  IF stuck IS NOT NULL THEN
    RAISE EXCEPTION E'На старі рядки ще щось посилається — розберись, перш ніж видаляти:\n  %', stuck;
  END IF;
END $$;

DELETE FROM feature
 WHERE eng_name IN (
  'Blessing of the Raven Queen',
  'Channel Divinity: Guided Strike',
  'Child of the Sea',
  'Cloak of Shadows',
  'Duergar Magic',
  'Duergar Resilience',
  'Dwarven Armor Training',
  'Dwarven Toughness',
  'Friend of the Sea',
  'Necrotic Resistance',
  'Psionic Power',
  'Psychic Blades',
  'Radiant Soul',
  'Shapechanger',
  'Stone Camouflage'
 );

COMMIT;
