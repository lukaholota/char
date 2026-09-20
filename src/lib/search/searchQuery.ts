/**
 * Ukrainian-aware query matching for the omni-search index.
 *
 * Two rules the owner asked for explicitly (docs/o13-2024-completeness/kr13.4-search-aliases.md):
 * the г↔х swap is a permanent normalisation of the *query* (people type «беголдер» for
 * «бехолдер»), and a query word has to reach an inflected form of the same word
 * («бій верхи» → «Верховий та підводний бій»).
 */

export type SearchableText = {
  lower: string;
  words: string[];
};

export type QueryMatcher = {
  /// Whole normalised query, one entry per г↔х variant. Used for ranking.
  phrases: string[];
  /// The same variants split into words. Used for matching.
  variants: string[][];
};

const UKRAINIAN_ENDING = /[аеєиіїоуюяьй]$/;
const MAX_STEM_LENGTH_GAP = 3;
const MIN_STEM_LENGTH = 2;
const MIN_LOOSE_WORD_LENGTH = 3;
const MAX_INFLECTION_LETTERS = 2;

/// Згортає написання, які українці плутають однаково часто: ґ→г та и/ї→і. Це той самий клас
/// проблеми, що й г↔х, тільки дешевший — тут не потрібен другий варіант запиту, бо згортання
/// застосовується й до тексту індексу.
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’ʼ`´]/g, "'")
    .replace(/ґ/g, "г")
    .replace(/[иї]/g, "і");
}

export function swapGutturals(value: string): string {
  return value.replace(/[гх]/g, (letter) => (letter === "г" ? "х" : "г"));
}

/// «Шкода» і «ушкодження» співіснують у текстах — dictionary.json суперечить сам собі
/// (rules.damage = «Шкода», rules.damageRoll = «Кидок ушкоджень») і переписувати ~3300 уживань
/// ніхто не буде. Тому це пара для нормалізації запиту, поруч із г↔х: не літерне згортання
/// (обидва слова лишаються різними в індексованому тексті), а додатковий варіант фрази.
/// Заміна йде цілим словом (а не префіксом-регексом на всю фразу), бо hasSameStem відкидає пару
/// слів, чия довжина різниться більш ніж на MAX_STEM_LENGTH_GAP — «шкодження» (склеєне з хвостом
/// «ушкодження») вже не влучає в коротке «шкоди»/«шкоду», а чиста словникова форма влучає.
export function swapDamageWord(value: string): string {
  return value
    .split(/(\s+)/)
    .map((token) => {
      if (/^ушкодж/.test(token)) return "шкода";
      if (/^шкод/.test(token)) return "ушкодження";
      return token;
    })
    .join("");
}

export function buildSearchableText(parts: Array<string | null | undefined>): SearchableText {
  const lower = normalizeSearchText(parts.filter(Boolean).join(" "));
  return { lower, words: splitWords(lower) };
}

export function buildQueryMatcher(query: string): QueryMatcher | null {
  const normalized = normalizeSearchText(query).trim();
  if (!normalized) return null;

  const phrases = buildPhraseVariants(normalized);
  return { phrases, variants: phrases.map(splitWords) };
}

export function buildQueryVariants(query: string): string[] {
  const raw = query.trim();
  const normalized = normalizeSearchText(raw);
  return Array.from(new Set([raw, ...buildPhraseVariants(normalized)].filter(Boolean)));
}

function buildPhraseVariants(normalized: string): string[] {
  const variants = new Set([normalized]);
  variants.add(swapGutturals(normalized));
  variants.add(swapDamageWord(normalized));
  variants.add(swapDamageWord(swapGutturals(normalized)));
  return [...variants];
}

export function matchesQuery(matcher: QueryMatcher, text: SearchableText): boolean {
  return matcher.variants.some(
    (words) => words.length > 0 && words.every((word) => matchesWord(word, text))
  );
}

/// 0 is the strongest match; 7 means "matched only through keywords".
export function findMatchRank(
  matcher: QueryMatcher,
  title: string,
  subtitle?: string,
  aliases?: string[]
): number {
  const titleLower = normalizeSearchText(title);
  const subtitleLower = subtitle ? normalizeSearchText(subtitle) : "";
  const titleWords = splitWords(titleLower);
  const aliasesLower = (aliases ?? []).map(normalizeSearchText);

  let rank = 7;
  for (const [variantIndex, phrase] of matcher.phrases.entries()) {
    if (titleLower === phrase) return 0;
    if (aliasesLower.includes(phrase)) rank = Math.min(rank, 1);
    if (titleLower.startsWith(phrase)) rank = Math.min(rank, 1);
    if (subtitleLower === phrase) rank = Math.min(rank, 2);
    if (subtitleLower.startsWith(phrase)) rank = Math.min(rank, 3);
    if (coversTitleWords(matcher.variants[variantIndex], titleWords)) rank = Math.min(rank, 4);
    if (titleLower.includes(phrase)) rank = Math.min(rank, 5);
    if (subtitleLower.includes(phrase)) rank = Math.min(rank, 6);
  }

  return rank;
}

/// «дія» має піднімати «Дії в бою» над «Книгою Звеличених Діянь»: для рангу потрібна та сама
/// основа слова, а не просто спільний початок, як у мʼякшому правилі пошуку.
function coversTitleWords(queryWords: string[], titleWords: string[]): boolean {
  if (queryWords.length === 0) return false;
  return queryWords.every((queryWord) =>
    titleWords.some((titleWord) => stripInflection(queryWord) === stripInflection(titleWord))
  );
}

function splitWords(value: string): string[] {
  return value.split(/[^\p{L}\p{N}']+/u).filter(Boolean);
}

function matchesWord(word: string, text: SearchableText): boolean {
  if (text.lower.includes(word)) return true;
  if (word.length < MIN_LOOSE_WORD_LENGTH) return false;
  return text.words.some((indexed) => hasSameStem(word, indexed));
}

function hasSameStem(queryWord: string, indexedWord: string): boolean {
  if (Math.abs(queryWord.length - indexedWord.length) > MAX_STEM_LENGTH_GAP) return false;

  const queryStem = stripInflection(queryWord);
  const indexedStem = stripInflection(indexedWord);
  if (queryStem.length < MIN_STEM_LENGTH || indexedStem.length < MIN_STEM_LENGTH) return false;

  return queryStem.startsWith(indexedStem) || indexedStem.startsWith(queryStem);
}

/// Українське закінчення буває й дволітерним: «дикої магії» — це «дика магія» у родовому
/// відмінку, а не інші слова. Тому основа зрізає до двох кінцевих голосних, доки лишається корінь.
function stripInflection(word: string): string {
  let stem = word;
  for (let letters = 0; letters < MAX_INFLECTION_LETTERS; letters++) {
    if (stem.length <= MIN_STEM_LENGTH || !UKRAINIAN_ENDING.test(stem)) break;
    stem = stem.slice(0, -1);
  }
  return stem;
}
