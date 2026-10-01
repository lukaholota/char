import { CURRENT_RELEASE_FLAG, CURRENT_RELEASE_SLIDES } from "../src/lib/whats-new/release-notes";

type Query = Record<string, unknown>;
type Series = { kind: "EventsNode"; event: string; name: string; math: string; properties?: Query[] };
export type AnalyticsInsight = { name: string; description: string; query: Query };
export type AnalyticsDashboard = { name: string; description: string; insights: AnalyticsInsight[] };
type TrendOptions = { breakdown?: string; description?: string };

const PATH = "coalesce(properties.$pathname, '/')";
const NORMALIZED_PATH = `replaceRegexpOne(replaceRegexpOne(${PATH}, '^/no-ai(/|$)', '/'), '^/2024(/|$)', '/')`;
const PAGE_GROUP = `if(${NORMALIZED_PATH} = '/', 'Головна', if(splitByChar('/', ${NORMALIZED_PATH})[2] = 'pers', 'char', splitByChar('/', ${NORMALIZED_PATH})[2]))`;
const EDITION = `coalesce(properties.edition, if(match(${PATH}, '^/(no-ai/)?2024(/|$)'), '2024', if(match(${NORMALIZED_PATH}, '^/(char/[0-9]+|pers/)'), 'Невідомо (старі листи)', '2014')))`;
const NO_AI = `if(coalesce(toString(properties.no_ai), '') IN ('true','1') OR match(${PATH}, '^/no-ai(/|$)'), 'Без ШІ', 'З ілюстраціями')`;
const NEW_DATA = "Події цієї функції почнуть збиратися після викатки analytics v2; порожній графік до викатки не означає відсутність використання.";
const SERIES_LABELS: Record<string, string> = {
  $pageview: "Перегляди", character_created: "Нові персонажі", character_copied: "Копії", character_snapshot_created: "Копії для історії", character_leveled_up: "Підвищення рівня",
  character_creation_started: "Відкриття конструктора", homebrew_create_clicked: "Натиснули Додати", homebrew_form_opened: "Відкриття форми", homebrew_form_started: "Почали редагувати", homebrew_submit_attempted: "Спроба публікації", homebrew_saved: "Збережено",
  search_opened: "Відкриття пошуку", search_performed: "Пошук", search_result_selected: "Вибір результату",
};

export function buildAnalyticsDashboards(internalPersonIds: string[]): AnalyticsDashboard[] {
  const exclusion = buildAnalyticsExclusion(internalPersonIds);
  const build: BuildTrend = (name, events, display, options = {}) => buildTrend(name, events, display, { ...options, exclusion });
  return [
    buildAudienceDashboard(build), buildCharactersDashboard(build, exclusion), buildHomebrewDashboard(build, exclusion),
    buildFeaturesDashboard(build, exclusion), buildOnboardingDashboard(build, exclusion),
  ];
}

export function buildAnalyticsExclusion(personIds: string[]): string {
  if (personIds.some((id) => !/^[a-f0-9-]{36}$/.test(id))) throw new Error("Invalid internal person ID");
  const personFilter = personIds.length ? `AND person_id NOT IN (${personIds.map((id) => `'${id}'`).join(",")})` : "";
  return `distinct_id NOT IN ('5','967') ${personFilter} AND coalesce(toString(person.properties.is_internal), '') NOT IN ('true','1') AND coalesce(toString(properties.is_internal), '') NOT IN ('true','1') AND coalesce(properties.environment, 'production') = 'production' AND coalesce(properties.$host, 'char.holota.family') IN ('char.holota.family','spells.holota.family')`;
}

function buildEvent(event: string, properties?: Query[]): Series {
  return { kind: "EventsNode", event, name: SERIES_LABELS[event] ?? event, math: "total", ...(properties ? { properties } : {}) };
}

function buildTrend(name: string, events: string[], display: string, options: TrendOptions & { exclusion: string }): AnalyticsInsight {
  const { exclusion, breakdown, description = NEW_DATA } = options;
  return { name, description, query: { kind: "InsightVizNode", source: {
    kind: "TrendsQuery", series: events.map((event) => buildEvent(event)), dateRange: { date_from: "-24h" }, interval: "hour",
    properties: [{ type: "hogql", key: exclusion }], filterTestAccounts: true,
    trendsFilter: { display, showLegend: true, showValuesOnSeries: true, aggregationAxisFormat: "numeric" },
    ...(breakdown ? { breakdownFilter: { breakdown, breakdown_type: "hogql", breakdown_limit: 20 } } : {}),
  } } };
}

function buildFunnel(name: string, series: Series[], exclusion: string, description = NEW_DATA): AnalyticsInsight {
  return { name, description, query: { kind: "InsightVizNode", source: {
    kind: "FunnelsQuery", series, dateRange: { date_from: "-24h" }, properties: [{ type: "hogql", key: exclusion }], filterTestAccounts: true,
    funnelsFilter: { funnelVizType: "steps", funnelOrderType: "ordered", funnelWindowInterval: 1, funnelWindowIntervalUnit: "day" },
  } } };
}

type BuildTrend = (name: string, events: string[], display: string, options?: TrendOptions) => AnalyticsInsight;

function buildAudienceDashboard(build: BuildTrend): AnalyticsDashboard {
  const historic = "Перегляди сторінок за вибраний період. Власник і QA виключені; localhost та інші хости виключені. Доступні історичні дані.";
  const page = (name: string, display: string, breakdown?: string, description = historic) => build(name, ["$pageview"], display, { breakdown, description });
  const visitors = page("Відвідувачі", "BoldNumber");
  setSeriesMath(visitors, "dau");
  return { name: "Char · Аудиторія та каталоги", description: "Популярність розділів, редакції, режим без ШІ та пристрої. За замовчуванням останні 24 години; змінюйте період зверху. Анонімні відвідувачі з memory persistence рахуються заново після перезавантаження; це не точна кількість людей.", insights: [
    page("Перегляди сторінок", "BoldNumber"), visitors,
    page("Найпопулярніші розділи", "ActionsBarValue", PAGE_GROUP, `${historic} /no-ai та /2024 прибрані; усі /char і /pers обʼєднані в char.`),
    page("Редакція: 2014 / 2024", "ActionsPie", EDITION, `${historic} Старі листи /char/<id> без edition показані окремо як невідомі.`),
    page("Режим без ШІ", "ActionsPie", NO_AI),
    page("Операційні системи", "ActionsPie", "coalesce(nullIf(properties.$os, ''), 'Невідомо')"),
    page("Тип пристрою", "ActionsPie", "coalesce(nullIf(properties.$device_type, ''), 'Невідомо')"),
    page("Країни", "ActionsTable", "coalesce(nullIf(properties.$geoip_country_name, ''), 'Невідомо')", `${historic} GeoIP оцінює місцезнаходження за IP; VPN може змінювати країну.`),
    page("Міста", "ActionsTable", "coalesce(nullIf(properties.$geoip_city_name, ''), 'Невідомо')", `${historic} GeoIP дає приблизне місто, а не точну адресу.`),
    page("Розміри екранів", "ActionsPie", "concat(toString(properties.$screen_width), ' × ', toString(properties.$screen_height))"),
    page("Ширина екрана", "ActionsPie", "multiIf(toInt(properties.$screen_width) < 640, '<640', toInt(properties.$screen_width) < 1024, '640–1023', toInt(properties.$screen_width) < 1440, '1024–1439', '≥1440')"),
    page("Звідки приходять", "ActionsBarValue", "coalesce(nullIf(properties.$referring_domain, ''), 'Прямий перехід')"),
  ] };
}

function buildCharactersDashboard(build: BuildTrend, exclusion: string): AnalyticsDashboard {
  const total = build("Усі створені записи персонажів", ["character_created", "character_copied", "character_snapshot_created"], "BoldNumber", { description: `Нові персонажі + ручні копії (також копії з папок) + копії для історії. ${NEW_DATA} Старий character_created рахує лише нових.` });
  setTrendFilter(total, { formulaNodes: [{ formula: "A+B+C" }] });
  const avatarUsers = build("Користувачі, які завантажили аватарку", ["custom_avatar_uploaded"], "BoldNumber");
  setSeriesMath(avatarUsers, "dau");
  return { name: "Char · Персонажі", description: "Створення, копіювання, копії для історії та успішні підвищення рівня. Типово останні 24 години. Усі завершення фіксуються сервером після збереження; запис для історії та успішний левелап — різні події.", insights: [
    total, build("Саме нові персонажі", ["character_created"], "BoldNumber", { description: "Історичний character_created плюс нові серверні події, без подвійного трекінгу. Копії й історія сюди не входять." }),
    build("Копії для історії", ["character_snapshot_created"], "BoldNumber"), build("Копії персонажів", ["character_copied"], "BoldNumber"),
    build("Нові персонажі чи левелапи?", ["character_created", "character_leveled_up"], "ActionsPie"),
    build("Створення, копії та левелапи в часі", ["character_created", "character_copied", "character_snapshot_created", "character_leveled_up"], "ActionsLineGraph"),
    build("Редакції нових персонажів", ["character_created"], "ActionsPie", { breakdown: EDITION }),
    buildFunnel("Конструктор: відкрили → створили", [buildEvent("character_creation_started"), buildEvent("character_created")], exclusion),
    build("Завантаження кастомних аватарок", ["custom_avatar_uploaded"], "BoldNumber", { description: `Успішно збережені портрети персонажів, включно із замінами. Копіювання персонажа з портретом і видалення портрета не рахуються. ${NEW_DATA}` }),
    avatarUsers, build("Завантаження аватарок у часі", ["custom_avatar_uploaded"], "ActionsLineGraph"),
  ] };
}

function buildHomebrewDashboard(build: BuildTrend, exclusion: string): AnalyticsDashboard {
  const kind = "if(properties.kind = 'CREATURE', 'Істоти', 'Заклинання')";
  const create = { type: "event", key: "mode", operator: "exact", value: "create" };
  const creationFunnel = (entryKind: string) => buildFunnel(`Створення ${entryKind === "CREATURE" ? "істоти" : "заклинання"}: повна лійка`, ["homebrew_create_clicked", "homebrew_form_opened", "homebrew_form_started", "homebrew_submit_attempted", "homebrew_saved"].map((event) => buildEvent(event, [create, { type: "event", key: "kind", operator: "exact", value: entryKind }])), exclusion, `Від натискання «Додати», включно з незалогіненими відвідувачами, до збереження. Прямі переходи на форму оминають перший крок. ${NEW_DATA}`);
  return { name: "Char · Хоумбрю", description: "Перегляди вкладок, перехід між заклинаннями та істотами, початок і завершення створення. Лійки показують незавершені спроби навіть без події виходу; виходи зі вкладки доставляються лише за можливості браузера.", insights: [
    build("Вкладки: заклинання / істоти", ["homebrew_tab_viewed"], "ActionsPie", { breakdown: kind }),
    build("Перемикання вкладок", ["homebrew_tab_switched"], "ActionsBarValue", { breakdown: "concat(properties.from_kind, ' → ', properties.kind)" }),
    buildFunnel("Заклинання → істоти", [buildEvent("homebrew_tab_viewed", [{ type: "event", key: "kind", operator: "exact", value: "SPELL" }]), buildEvent("homebrew_tab_switched", [{ type: "event", key: "from_kind", operator: "exact", value: "SPELL" }, { type: "event", key: "kind", operator: "exact", value: "CREATURE" }])], exclusion),
    creationFunnel("SPELL"), creationFunnel("CREATURE"),
    build("На якому етапі виходять", ["homebrew_form_abandoned"], "ActionsBarValue", { breakdown: "properties.stage" }),
    build("Помилки публікації", ["homebrew_submit_rejected"], "ActionsLineGraph"),
    build("Збережений хоумбрю", ["homebrew_saved"], "ActionsBarValue", { breakdown: "concat(properties.kind, ' · ', properties.mode)" }),
  ] };
}

function buildFeaturesDashboard(build: BuildTrend, exclusion: string): AnalyticsDashboard {
  const activations = build("Активовані риси: Лють, Пісня клинка та інші", ["character_feature_toggled"], "ActionsBarValue", { breakdown: "properties.feature" });
  addSourceFilter(activations, { type: "event", key: "is_active", operator: "exact", value: true });
  const zeroResults = { type: "event", key: "result_count", operator: "exact", value: 0 };
  const emptySearch = build("Пошуки без результатів", ["search_performed"], "BoldNumber");
  addSourceFilter(emptySearch, zeroResults);
  return { name: "Char · Пошук і функції листа", description: "Пошук без збору текстів запитів, використання Дикої форми, активних рис, бафів, концентрації, виснаження та редагування описів. Звичайні стани на кшталт отруєння ще не мають кнопки накладання в листі; читання правил не рахується як накладання стану.", insights: [
    build("Використання пошуку", ["search_opened", "search_performed", "search_result_selected"], "ActionsLineGraph"),
    build("Найчастіше вибирають у пошуку", ["search_result_selected"], "ActionsBarValue", { breakdown: "properties.category" }), emptySearch,
    buildFunnel("Пошук: відкрили → шукали → вибрали", ["search_opened", "search_performed", "search_result_selected"].map((event) => buildEvent(event)), exclusion),
    build("Дика форма: додавання та перевтілення", ["wildshape_form_added", "wildshape_entered"], "ActionsLineGraph"), activations,
    build("Виснаження: обрані рівні", ["character_exhaustion_changed"], "ActionsBarValue", { breakdown: "toString(properties.level)" }),
    build("Бафи та стани: увімкнення / вимкнення", ["character_buff_toggled"], "ActionsBarValue", { breakdown: "concat(properties.buff, ' · ', toString(properties.is_active))" }),
    build("Концентрація", ["character_concentration_changed"], "ActionsBarValue", { breakdown: "if(toString(properties.is_active) IN ('true','1'), 'Увімкнули', 'Завершили')" }),
    buildFunnel("Опис: почали редагувати → зберегли", ["feature_description_edit_started", "feature_description_saved"].map((event) => buildEvent(event)), exclusion),
    build("Збереження описів / повернення оригіналу", ["feature_description_saved"], "ActionsPie", { breakdown: "properties.action" }),
  ] };
}

function buildOnboardingDashboard(build: BuildTrend, exclusion: string): AnalyticsDashboard {
  const release = { type: "event", key: "release", operator: "exact", value: CURRENT_RELEASE_FLAG };
  const slides = CURRENT_RELEASE_SLIDES.map((slide) => buildEvent("whats_new_slide_viewed", [release, { type: "event", key: "slide", operator: "exact", value: slide.key }]));
  slides.forEach((series, index) => { series.name = `${index + 1}. ${CURRENT_RELEASE_SLIDES[index].title}`; });
  const reach = build("До яких слайдів доходять", ["whats_new_slide_viewed"], "ActionsBarValue", { breakdown: "concat(toString(properties.slide_number), '. ', properties.slide)" });
  addSourceFilter(reach, release);
  return { name: "Char · Онбординг", description: `Слайди «Що нового», реліз ${CURRENT_RELEASE_FLAG}. Відкриття й закриття доступні історично; глибина перегляду — після викатки v2. Свайпи та кліки на точки трекаються однаково. Строга лійка вимагає всі слайди по порядку, графік охоплення також бачить перестрибування.`, insights: [
    build("Відкрили / закрили онбординг", ["whats_new_shown", "whats_new_closed"], "ActionsLineGraph", { description: "Історичні події. Закриття не означає завершення всіх слайдів." }),
    reach, buildFunnel("Онбординг: усі слайди по порядку", [buildEvent("whats_new_shown", [release]), ...slides], exclusion),
    buildFunnel("Онбординг: відкрили → останній слайд", [buildEvent("whats_new_shown", [release]), slides[slides.length - 1]], exclusion),
  ] };
}

function setTrendFilter(insight: AnalyticsInsight, filter: Query): void {
  const source = insight.query.source as Query;
  source.trendsFilter = { ...(source.trendsFilter as Query), ...filter };
}

function addSourceFilter(insight: AnalyticsInsight, property: Query): void {
  const source = insight.query.source as Query;
  (source.properties as Query[]).push(property);
}

function setSeriesMath(insight: AnalyticsInsight, math: string): void {
  const source = insight.query.source as Query;
  (source.series as Series[]).forEach((series) => { series.math = math; });
}
