import {
  addSourceFilter, buildAnalyticsExclusion, buildEvent, buildFunnel, buildTrend, setSeriesMath,
  type AnalyticsDashboard, type AnalyticsInsight, type Series, type TrendOptions,
} from "./posthog-dashboard-queries";

type Query = Record<string, unknown>;

const MONTH = "-30d";
const BOT_FILTER = "(coalesce(properties.source, '') = 'server' OR coalesce(toString(properties.$virt_is_bot), 'false') NOT IN ('true','1'))";
const PICKED_WITH_RECOMMENDATIONS = "coalesce(toString(properties.recommendations_on), 'true') IN ('true','1')";
const ENGAGED = `((event = 'rpgbot_article_read_depth' AND toInt(properties.depth_percent) >= 50) OR event IN ('rpgbot_analysis_expanded','rpgbot_feature_analysis_opened','rpgbot_preset_selected','rpgbot_build_selected','rpgbot_spell_rating_opened','rpgbot_article_link_clicked') OR (event = 'rpgbot_spell_picked' AND ${PICKED_WITH_RECOMMENDATIONS}) OR (event = 'rpgbot_spell_recommendations_toggled' AND toString(properties.enabled) IN ('true','1')) OR (event = 'rpgbot_cta_clicked' AND properties.cta IN ('open_article','open_ukrainian_article','create_from_preset','assemble_build')))`;
const WEEK = "toStartOfWeek(toTimeZone(timestamp, 'Europe/Kyiv'), 1)";
const LABELS: Record<string, string> = {
  rpgbot_surface_viewed: "Перегляд поверхні", rpgbot_article_read_depth: "Глибина читання", rpgbot_analysis_expanded: "Розгорнули аналіз",
  rpgbot_cta_clicked: "Клік на перехід", rpgbot_preset_selected: "Обрали пресет", rpgbot_preset_submitted: "Натиснули «Створити»",
  rpgbot_preset_created: "Персонажа створено", rpgbot_preset_abandoned: "Покинули пресет", rpgbot_spell_picked: "Обрали заклинання",
  rpgbot_spell_recommendations_toggled: "Перемикач рекомендацій",
};

export function buildRpgbotDashboard(internalPersonIds: string[]): AnalyticsDashboard {
  const exclusion = buildAnalyticsExclusion(internalPersonIds);
  const scope = `${exclusion} AND ${BOT_FILTER}`;
  const trend = (name: string, events: string[], display: string, options: TrendOptions = {}) =>
    withRpgbotLabels(buildTrend(name, events, display, { ...options, exclusion: scope, dateFrom: MONTH, interval: "day" }));
  const funnel = (name: string, steps: Series[], description: string) => buildFunnel(name, steps, scope, description, MONTH);
  return {
    name: "Char · RPGbot", dateFrom: MONTH,
    description: "Чи знаходять, читають і користуються аналітикою RPGbot, готовими персонажами та рекомендаціями заклинань. Типово останні 30 днів = місячна оцінка запуску. Критерії успіху: docs/o49-rpgbot-analysis/launch-success-metrics.md. «Користувачі» = distinct ID: анонімні відвідувачі після перезавантаження рахуються заново, тож це верхня межа.",
    insights: [
      ...buildReachInsights(scope, trend), ...buildReadingInsights(trend, funnel),
      ...buildAnalysisInsights(trend, funnel), ...buildPresetInsights(scope, trend, funnel),
      ...buildSpellInsights(trend, funnel), ...buildOutcomeInsights(scope, exclusion),
    ],
  };
}

type Trend = (name: string, events: string[], display: string, options?: TrendOptions) => AnalyticsInsight;
type Funnel = (name: string, steps: Series[], description: string) => AnalyticsInsight;

function buildReachInsights(scope: string, trend: Trend): AnalyticsInsight[] {
  const users = trend("Користувачі, що бачили RPGbot", ["rpgbot_surface_viewed"], "BoldNumber", { description: "Унікальні distinct ID з переглядом будь-якої поверхні RPGbot за період. Анонімні ID верхня межа." });
  setSeriesMath(users, "dau");
  const fromPage = trend("Звідки приходять на читач RPGbot", ["$pageview"], "ActionsBarValue", { breakdown: "coalesce(nullIf(properties.previous_page_group, ''), 'Прямий вхід / перше відкриття')", description: "Попередня сторінка перед /rules/optimization. Показує, чи працюють плитка на головній, меню й посилання з каталогів." });
  addSourceFilter(fromPage, { type: "event", key: "page_group", operator: "exact", value: "rpgbot" });
  return [
    users,
    trend("Перегляди поверхонь RPGbot", ["rpgbot_surface_viewed"], "ActionsBarValue", { breakdown: "properties.surface", description: "Скільки разів показано кожну поверхню: список статей, стаття, аналіз у модалці, галерея готових персонажів, вибір заклинань." }),
    fromPage,
    buildSql("Охоплення і залучення по тижнях", `SELECT ${WEEK} AS week,
  uniqIf(distinct_id, event = '$pageview') AS active_visitors,
  uniqIf(distinct_id, startsWith(event, 'rpgbot_')) AS rpgbot_visitors,
  uniqIf(distinct_id, ${ENGAGED}) AS engaged_visitors,
  round(100.0 * rpgbot_visitors / active_visitors, 1) AS reach_percent,
  round(100.0 * engaged_visitors / rpgbot_visitors, 1) AS engaged_of_reached_percent
FROM events WHERE timestamp >= now() - INTERVAL 30 DAY AND ${scope}
GROUP BY week ORDER BY week`, "Охоплення = частка активних відвідувачів тижня, що бачили RPGbot. Залучені = прочитали ≥50% статті, розгорнули аналіз, обрали пресет, вмикнули рекомендації або перейшли з RPGbot далі."),
    buildRetention("Повернення тих, хто бачив RPGbot", scope),
  ];
}

function buildReadingInsights(trend: Trend, funnel: Funnel): AnalyticsInsight[] {
  const readers = trend("Найчитаніші статті", ["rpgbot_surface_viewed"], "ActionsBarValue", { breakdown: "properties.article_slug", description: "Відкриття читача статті за slug." });
  addSourceFilter(readers, { type: "event", key: "surface", operator: "exact", value: "article_reader" });
  return [
    readers,
    trend("Глибина читання статей", ["rpgbot_article_read_depth"], "ActionsBarValue", { breakdown: "concat(toString(properties.depth_percent), '%')", description: "Скільки відкриттів дійшли до 25/50/75/100% розділів статті (розділ зараховано, коли він потрапив у екран)." }),
    funnel("Стаття: відкрили → 50% → дочитали", [
      named(buildEvent("rpgbot_surface_viewed", [propertyIs("surface", "article_reader")]), "Відкрили статтю"),
      named(buildEvent("rpgbot_article_read_depth", [propertyIs("depth_percent", 50)]), "Дійшли до 50%"),
      named(buildEvent("rpgbot_article_read_depth", [propertyIs("depth_percent", 100)]), "Дочитали"),
    ], "Головна лійка читання. Дві різні статті одного користувача змішуються; для порівняння статей дивись графік «Найчитаніші»."),
    trend("Куди ведуть посилання зі статей", ["rpgbot_article_link_clicked"], "ActionsBarValue", { breakdown: "properties.link_kind", description: "catalog = у наш каталог (заклинання, риси); original = оригінал на rpgbot.net; other = решта." }),
    restrictToCta(trend("Переходи до оригіналу RPGbot", ["rpgbot_cta_clicked"], "ActionsBarValue", { breakdown: "properties.surface", description: "Клики «Оригінал» зі статті та панелі заклинання. Нуль кліків означає, що люди не помічають походження аналітики." }), "open_original"),
  ];
}

function buildAnalysisInsights(trend: Trend, funnel: Funnel): AnalyticsInsight[] {
  return [
    funnel("Аналіз у модалці підкласу: побачили → розгорнули → у статтю", [
      named(buildEvent("rpgbot_surface_viewed", [propertyIs("surface", "subclass_analysis")]), "Побачили аналіз"),
      named(buildEvent("rpgbot_analysis_expanded"), "Розгорнули повний"),
      named(buildEvent("rpgbot_cta_clicked", [propertyIs("cta", "open_article"), propertyIs("surface", "subclass_analysis")]), "Відкрили статтю"),
    ], "Основний сценарій Р55: прочитати аналіз біля підкласу. Каталог і конструктор разом; розбивка за placement — на графіку нижче."),
    restrictToSurface(trend("Аналіз підкласу: каталог чи конструктор", ["rpgbot_surface_viewed"], "ActionsPie", { breakdown: "properties.placement", description: "Де гравці бачать аналіз підкласу." }), "subclass_analysis"),
    trend("Аналіз окремих умінь (кнопка гобліна)", ["rpgbot_feature_analysis_opened"], "ActionsLineGraph", { description: "Відкриття оцінки конкретної риси біля її офіційного опису." }),
    restrictToSurface(trend("Оцінка підкласів, які дивляться", ["rpgbot_surface_viewed"], "ActionsBarValue", { breakdown: "coalesce(toString(properties.rating_score), 'без оцінки')", description: "Оцінка автора RPGbot 1–4 для переглянутих підкласів. Показує, чи дивляться люди лише топові варіанти." }), "subclass_analysis"),
  ];
}

function buildPresetInsights(scope: string, trend: Trend, funnel: Funnel): AnalyticsInsight[] {
  const created = trend("Персонажів створено через готові пресети", ["rpgbot_preset_created"], "BoldNumber", { description: "Успішні створення зі сторінки пресета." });
  return [
    funnel("Готові персонажі: галерея → створено", [
      named(buildEvent("rpgbot_surface_viewed", [propertyIs("surface", "preset_gallery")]), "Бачили галерею"),
      named(buildEvent("rpgbot_preset_selected"), "Обрали пресет"),
      named(buildEvent("rpgbot_surface_viewed", [propertyIs("surface", "preset_review")]), "Перевіряють персонажа"),
      named(buildEvent("rpgbot_preset_submitted"), "Натиснули «Створити»"),
      named(buildEvent("rpgbot_preset_created"), "Персонажа створено"),
    ], "Порівняй завершення з ручним конструктором нижче. Лійка 1 доба."),
    buildFunnel("Ручний конструктор для порівняння: відкрили → створили", [buildEvent("character_creation_started"), buildEvent("character_created", [propertyIs("creation_type", "new")])], scope, "Контрольна лійка: той самий вимір для ручного шляху. Рахує лише character_created з creation_type = new: пресети 1-го рівня (ready_preset) і складання вищих рівнів (build_assembly) сюди не входять. Люди обирають шлях самі, тож різниця — оцінка, не A/B.", MONTH),
    created,
    trend("Які пресети обирають", ["rpgbot_preset_selected"], "ActionsBarValue", { breakdown: "properties.preset_id", description: "Популярність готових персонажів. Пресети, яких не обирають, кандидати на заміну." }),
    trend("Де кидають пресет", ["rpgbot_preset_abandoned"], "ActionsBarValue", { breakdown: "properties.stage", description: "review = вибір способу створення, name = крок імені, customize_<крок> = конкретний крок налаштування, submitting = пішли під час створення. Під час входу через Google подія не надсилається. Best effort (pagehide)." }),
    trend("Чи змінюють готовий персонаж", ["rpgbot_preset_submitted"], "ActionsPie", { breakdown: "if(toInt(JSONLength(toString(properties.customized_sections))) > 0, 'Змінили вибори', 'Створили як є')", description: "Частка створень, де гравець змінив характеристики, навички, експертизу, вибори класу й раси, заклинання чи вибори вищих рівнів. Висока частка «як є» = пресет попадає в очікування." }),
    trend("Помилки створення пресета", ["rpgbot_preset_create_failed"], "ActionsBarValue", { breakdown: "properties.reason", description: "validation = клієнтська перевірка; sign_in_required = треба увійти; rejected = сервер не прийняв вибори; timeout = сервер скасував довге створення; network = запит не дійшов; server = помилка бази чи сервера." }),
  ];
}

function buildSpellInsights(trend: Trend, funnel: Funnel): AnalyticsInsight[] {
  const picks = trend("Обрані заклинання за оцінкою RPGbot", ["rpgbot_spell_picked"], "ActionsBarValue", { breakdown: "coalesce(toString(properties.rating_score), 'без оцінки')", description: "Лише вибори з увімкненими рекомендаціями (recommendations_on). Порівняй частку 3–4 із часткою високих оцінок у самому списку класу (з generated-даних): перевищення означає, що рекомендації змінюють вибір." });
  return [
    funnel("Рекомендації заклинань: побачили вибір → ввімкнули → обрали", [
      named(buildEvent("rpgbot_surface_viewed", [propertyIs("surface", "spell_picker")]), "Крок вибору заклинань"),
      named(buildEvent("rpgbot_spell_recommendations_toggled", [propertyIs("enabled", true)]), "Ввімкнули рекомендації"),
      named(buildEvent("rpgbot_spell_picked", [{ type: "hogql", key: PICKED_WITH_RECOMMENDATIONS }]), "Обрали заклинання"),
    ], "Перемикач запамʼятовується в localStorage, тож користувач, що вже ввімкнув, вдруге не перемикає. Для частки з увімкненими дивись графік нижче."),
    restrictToSurface(trend("Рекомендації вже ввімкнені на кроці вибору", ["rpgbot_surface_viewed"], "ActionsPie", { breakdown: "if(toString(properties.recommendations_on) IN ('true','1'), 'Ввімкнені', 'Вимкнені')", description: "Стан перемикача в момент показу кроку вибору заклинань." }), "spell_picker"),
    withPicksRecommended(picks),
    trend("Перемикач RPGbot у каталозі заклинань листа", ["rpgbot_spell_chip_toggled"], "ActionsBarValue", { breakdown: "if(toString(properties.enabled) IN ('true','1'), 'Ввімкнули', 'Вимкнули')", description: "Додавання заклинань з листа через вбудований каталог. До 2026-10-13 подія означала чип-фільтр «Лише рекомендовані (3–4)», з 2026-10-13 — перемикач оцінок і сортування, як у левелапі (типово ввімкнений)." }),
    trend("Відкрили оцінку заклинання", ["rpgbot_spell_rating_opened"], "ActionsBarValue", { breakdown: "concat(coalesce(properties.placement, '?'), ' · ', toString(properties.rating_score))", description: "Клік по бейджу оцінки: catalog = рядок каталогу листа, creator = картка кроку вибору заклинань." }),
  ];
}

function buildOutcomeInsights(scope: string, exclusion: string): AnalyticsInsight[] {
  return [
    buildSql("Частка нових персонажів через пресети", `SELECT ${WEEK} AS week,
  countIf(event = 'character_created') AS new_characters,
  countIf(event = 'rpgbot_preset_created') AS via_presets,
  round(100.0 * via_presets / nullIf(new_characters, 0), 1) AS preset_share_percent
FROM events WHERE event IN ('character_created', 'rpgbot_preset_created') AND timestamp >= now() - INTERVAL 30 DAY AND ${scope}
GROUP BY week ORDER BY week`, "Північна зірка запуску для пресетів: яка частка всіх нових персонажів створена через готові пресети. Знаменник — усі серверні character_created (new, ready_preset, build_assembly), бо пресет вищого рівня зберігається як build_assembly."),
    buildSql("Після RPGbot: створення чи левелап за добу", `SELECT has_engaged AS engaged_with_rpgbot,
  count() AS users,
  countIf(arrayExists(t -> t > anchor AND t < anchor + INTERVAL 1 DAY, outcomes)) AS users_with_outcome,
  round(100.0 * users_with_outcome / users, 1) AS outcome_percent
FROM (
  SELECT distinct_id,
    countIf(${ENGAGED}) > 0 AS has_engaged,
    if(has_engaged, minIf(timestamp, ${ENGAGED}), minIf(timestamp, event = '$pageview')) AS anchor,
    groupArrayIf(timestamp, event IN ('character_created', 'character_leveled_up') AND properties.source = 'server') AS outcomes
  FROM events WHERE timestamp >= now() - INTERVAL 30 DAY AND ${scope} AND match(distinct_id, '^[0-9]+$')
  GROUP BY distinct_id HAVING countIf(event = '$pageview') > 0
)
GROUP BY has_engaged`, "Лише залогінені (числовий distinct ID). Залучені до RPGbot проти решти: чи є створення персонажа або левелап протягом 24 год після першого залучення (для решти від першого перегляду). Це кореляція: хто читає, активніший за природою."),
    buildRetention("Повернення тих, хто створив персонажа через пресет", `${exclusion} AND ${BOT_FILTER}`, "rpgbot_preset_created"),
  ];
}

function buildSql(name: string, query: string, description: string): AnalyticsInsight {
  return { name, description, query: { kind: "DataVisualizationNode", source: { kind: "HogQLQuery", query } } };
}

function buildRetention(name: string, scope: string, target = "rpgbot_surface_viewed"): AnalyticsInsight {
  return { name, description: "Тижневе повернення (будь-який перегляд сторінки) від першої появи події. Перший тиждень після запуску без дорослих когорт — не оцінюй.", query: { kind: "InsightVizNode", source: {
    kind: "RetentionQuery", version: 2, dateRange: { date_from: MONTH }, properties: [{ type: "hogql", key: scope }], filterTestAccounts: true,
    retentionFilter: { period: "Week", targetEntity: { id: target, type: "events" }, returningEntity: { id: "$pageview", type: "events" }, retentionType: "retention_first_time", totalIntervals: 5 },
  } } };
}

function withPicksRecommended(insight: AnalyticsInsight): AnalyticsInsight {
  addSourceFilter(insight, { type: "hogql", key: PICKED_WITH_RECOMMENDATIONS });
  return insight;
}

function named(series: Series, name: string): Series {
  series.name = name;
  return series;
}

function propertyIs(key: string, value: string | number | boolean): Query {
  return { type: "event", key, operator: "exact", value };
}

function restrictToSurface(insight: AnalyticsInsight, surface: string): AnalyticsInsight {
  addSourceFilter(insight, propertyIs("surface", surface));
  return insight;
}

function restrictToCta(insight: AnalyticsInsight, cta: string): AnalyticsInsight {
  addSourceFilter(insight, propertyIs("cta", cta));
  return insight;
}

function withRpgbotLabels(insight: AnalyticsInsight): AnalyticsInsight {
  const series = (insight.query.source as Query).series as Series[] | undefined;
  series?.forEach((entry) => { entry.name = LABELS[entry.event] ?? entry.name; });
  return insight;
}
