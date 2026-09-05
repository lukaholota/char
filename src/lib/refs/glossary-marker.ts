/// Маркер оригіналу: «променевої{{radiant}} шкоди». Український термін лишається текстом, а
/// англійський оригінал їде поруч і показується на наведення чи натискання. Заведено рішенням
/// власника 2026-08-25 ([Р20]) — українська дає по кілька синонімів на термін, тож без
/// оригіналу звірити переклад із книгою неможливо.
///
/// Визначення тут одне на весь проєкт: його читає і рендерер, і гейт партій бестіарію. Дві
/// копії того самого правила — саме той клас дефекту, через який цей проєкт уже ламався.
const MARKER = /\{\{([^{}]+)\}\}/g;

/// Парна форма «{{Пасивний аналіз поведінки|Passive Insight}}» — для прози, де українських
/// слів більше, ніж в оригіналі, і лік слів не дістає до початку терміна (власник,
/// 2026-09-04). Термін стоїть усередині дужок, тож без рендерера він лишається текстом, а
/// оригінал забирається — так само, як у звичайній формі.
const PAIR_SEPARATOR = "|";

/// Скільки українських слів перед маркером він покриває: стільки, скільки слів в оригіналі, але
/// не перетинаючи пунктуацію, розмітку й не захоплюючи чисел. Без цього «Аксіоматичний
/// розум{{Axiomatic Mind}}» підкреслив би саме «розум», а «30 променевої{{radiant damage}}» зʼїло б
/// число. Символи розмітки — межа з тієї ж причини: маркер на жирному лемі («***Кров
/// асасина{{Assassin's Blood}}***») інакше затягнув би зірочки всередину <abbr>, і замість
/// жирного тексту читач побачив би самі зірочки. HTML-тег — та сама межа: назва секції
/// статблока в каталозі стоїть як «<p><b>Хауда{{Howdah}}.</b>», і без неї <abbr> обгортав
/// би `<p><b>` — рендерер віддавав порожню підказку окремим абзацом.
const WORD_BOUNDARY = /[\s.,;:!?()«»"[\]*_`|<>]/;

/// Назва секції статблока в каталозі — «<p><b>Чутливість до сонячного світла{{Sunlight
/// Sensitivity}}.</b>». Прохід KR30.2 ставив маркер на цілу назву, тож межа `<b>` і є межею
/// терміна: підкреслювати «стільки слів, скільки в оригіналі» тут означало показати читачеві
/// половину назви як звірену (власник, 2026-09-04). Правило тримається саме HTML-жирного: у
/// markdown «**Показ НІП{{NPC}}**» маркер стоїть на одному слові, і весь шматок там чужий.
const SECTION_NAME_OPENER = /(?:<b>|<strong>)\s*$/;
const SECTION_NAME_CLOSER = /^\s*[.:]?\s*(?:\([^)]*\)\s*[.:]?\s*)?(?:<\/b>|<\/strong>)/;
const SECTION_NAME_STOP = /[.,;:!?()«»"[\]*_`|<>\n]/;
const MARKUP_STOP = /[*_`|<>\n]/;

export function stripGlossaryMarkers(text: string): string {
  return text.replace(MARKER, (_whole, body: string) => readMarker(body).pairedTerm ?? "");
}

export function findGlossaryMarkers(text: string): Array<{ term: string; original: string }> {
  const found: Array<{ term: string; original: string }> = [];
  for (const match of text.matchAll(MARKER)) {
    const at = match.index ?? 0;
    const { pairedTerm, original } = readMarker(match[1]);
    const term = pairedTerm ?? text.slice(findTermStart(text, at, at + match[0].length, original), at).trim();
    found.push({ term, original });
  }
  return found;
}

export function expandGlossaryMarkersToHtml(text: string): string {
  let result = "";
  let cursor = 0;

  for (const match of text.matchAll(MARKER)) {
    const at = match.index ?? 0;
    const { pairedTerm, original } = readMarker(match[1]);
    const start = pairedTerm === null ? findTermStart(text, at, at + match[0].length, original) : at;
    const term = pairedTerm ?? text.slice(start, at).trim();
    result += text.slice(cursor, start);
    result += `<abbr title="${escapeHtmlAttribute(original)}">${term === "" ? original : term}</abbr>`;
    cursor = at + match[0].length;
  }

  return result + text.slice(cursor);
}

function readMarker(body: string): { pairedTerm: string | null; original: string } {
  const separatorAt = body.indexOf(PAIR_SEPARATOR);
  if (separatorAt < 0) return { pairedTerm: null, original: body.trim() };
  return { pairedTerm: body.slice(0, separatorAt).trim(), original: body.slice(separatorAt + 1).trim() };
}

function findTermStart(text: string, at: number, markerEnd: number, original: string): number {
  let start = findSectionNameStart(text, at, markerEnd, original) ?? findWordsStart(text, at, original);
  while (start < at && /\s/.test(text[start])) start += 1;
  return start;
}

/// «Голова чорного дракона: Кислотний подих{{Black Dragon Head: Acid Breath}}» і «Танцюй, моя
/// ляльо!{{Dance, My Puppet!}}» — пунктуація належить самій назві, коли вона є і в оригіналі.
function findSectionNameStart(text: string, at: number, markerEnd: number, original: string): number | null {
  const isStop = (char: string) => MARKUP_STOP.test(char) || (SECTION_NAME_STOP.test(char) && !original.includes(char));
  let start = at;
  while (start > 0 && !isStop(text[start - 1])) start -= 1;
  if (!SECTION_NAME_OPENER.test(text.slice(0, start))) return null;
  if (!SECTION_NAME_CLOSER.test(text.slice(markerEnd))) return null;

  const firstLetter = text.slice(start, at).search(/\p{L}/u);
  if (firstLetter < 0) return null;
  return findWordStart(text, start + firstLetter + 1);
}

function findWordsStart(text: string, at: number, original: string): number {
  const wanted = original.trim().split(/\s+/).length;
  let start = at;

  for (let taken = 0; taken < wanted; taken += 1) {
    const wordStart = findWordStart(text, start);
    if (wordStart === start) break;
    if (/^\d+$/.test(text.slice(wordStart, start))) break;
    start = wordStart;
    if (start === 0 || !/\s/.test(text[start - 1])) break;
    start -= 1;
  }

  return start;
}

function findWordStart(text: string, end: number): number {
  let start = end;
  while (start > 0 && !WORD_BOUNDARY.test(text[start - 1])) start -= 1;
  return start;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
