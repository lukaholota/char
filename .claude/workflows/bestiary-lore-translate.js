export const meta = {
  name: 'bestiary-lore-translate',
  whenToUse: 'KR33.8: після `dump-bestiary-lore-inputs.ts --out <base>` — args {repo, base, inputs: index.json без поля file}',
  description: 'KR33.8: переклад вступів до груп істот бестіарію — глосарій, переклад, дві перевірки, правка, звірка узгодженості',
  phases: [
    { title: 'Glossary', detail: 'розвідники термінів по частинах корпусу → суддя зводить глосарій' },
    { title: 'Translate', detail: 'один перекладач на групу' },
    { title: 'Verify', detail: 'дві лінзи: вірність джерелу й домашні правила' },
    { title: 'Fix', detail: 'правка за знайденими проблемами' },
    { title: 'Sweep', detail: 'узгодженість термінів між групами' },
  ],
}

const { base, inputs, repo, skipScouts, glossaryReady, batchWords } = args
const rulesPath = `${repo}/docs/o33-catalog-prose/kr33.8-translation-rules.md`
const scoutedPath = `${repo}/docs/o33-catalog-prose/kr33.8-terms-scouted.json`
const glossaryPath = `${base}/glossary.json`
const inputFile = (item) => `${base}/${item.edition}/${item.key}.json`
const outFile = (item) => `${base}/out/${item.edition}/${item.key}.json`

const TERMS_SCHEMA = {
  type: 'object',
  properties: {
    terms: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          term: { type: 'string' },
          category: { type: 'string' },
          dictionaryForm: { type: 'string' },
          dictionaryPath: { type: 'string' },
          precedents: { type: 'array', items: { type: 'object', properties: { form: { type: 'string' }, where: { type: 'string' } }, required: ['form', 'where'] } },
          suggested: { type: 'string' },
          why: { type: 'string' },
        },
        required: ['term', 'category', 'precedents', 'suggested'],
      },
    },
  },
  required: ['terms'],
}

const GLOSSARY_SCHEMA = {
  type: 'object',
  properties: {
    total: { type: 'number' },
    fromDictionary: { type: 'number' },
    fromPrecedent: { type: 'number' },
    newTerms: { type: 'array', items: { type: 'object', properties: { term: { type: 'string' }, form: { type: 'string' }, why: { type: 'string' } }, required: ['term', 'form'] } },
    conflicts: { type: 'array', items: { type: 'string' } },
  },
  required: ['total', 'fromDictionary', 'fromPrecedent', 'newTerms', 'conflicts'],
}

const TRANSLATION_SCHEMA = {
  type: 'object',
  properties: {
    key: { type: 'string' },
    words: { type: 'number' },
    newTerms: { type: 'array', items: { type: 'object', properties: { term: { type: 'string' }, form: { type: 'string' }, why: { type: 'string' } }, required: ['term', 'form'] } },
  },
  required: ['key', 'words', 'newTerms'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    refuted: { type: 'boolean' },
    problems: { type: 'array', items: { type: 'object', properties: { where: { type: 'string' }, issue: { type: 'string' }, fix: { type: 'string' } }, required: ['where', 'issue', 'fix'] } },
  },
  required: ['refuted', 'problems'],
}

const FIX_SCHEMA = {
  type: 'object',
  properties: {
    applied: { type: 'number' },
    skipped: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, why: { type: 'string' } }, required: ['issue', 'why'] } },
  },
  required: ['applied', 'skipped'],
}

const SWEEP_SCHEMA = {
  type: 'object',
  properties: {
    problems: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, where: { type: 'string' }, issue: { type: 'string' }, fix: { type: 'string' } }, required: ['file', 'where', 'issue', 'fix'] } },
  },
  required: ['problems'],
}

const common = `Репозиторій: ${repo}. Правила перекладу (обовʼязкові): ${rulesPath}. Словник: ${repo}/src/lib/refs/dictionary.json (три верхні ключі DND_DICTIONARY, SPELLS, CONTENT_TRANSLATIONS — шукати rg в усіх трьох).`

// ---------- Phase 1: glossary ----------
let glossaryReport = null
if (!glossaryReady) {
phase('Glossary')
const CHUNK = 11
const chunks = []
for (let i = 0; i < inputs.length; i += CHUNK) chunks.push(inputs.slice(i, i + CHUNK))
if (!skipScouts) log(`Розвідка термінів: ${chunks.length} частин по ≤${CHUNK} груп`)

const scouted = skipScouts ? [] : await parallel(chunks.map((chunk, index) => () =>
  agent(
    `${common}

Ти — розвідник термінології для перекладу лору бестіарію D&D 5e українською. Прочитай поле "markdown" у кожному з цих файлів:
${chunk.map((item) => `- ${inputFile(item)} (${item.engName}, ${item.edition})`).join('\n')}

Випиши КОЖЕН термін, який перекладач муситиме обирати, а не перекладати буквально:
- власні назви (боги, князі демонів і дияволів, міста, регіони, річки, плани буття, ордени, артефакти, історичні події на кшталт Blood War),
- назви видів істот і їхніх різновидів, які згадано в тексті (не лише героя статті),
- специфічну лексику D&D (true dragon, wyrmling, hoard, lair, spellcaster, arcane, divine, fey, undead, construct, plane, portal, aberration, humanoid…),
- терміни зі станів, типів шкоди, розмірів і механіки, що трапляються в прозі.

Для кожного терміна:
1. знайди словникову форму: rg -i -n "<термін>" ${repo}/src/lib/refs/dictionary.json — і вкажи dictionaryForm та dictionaryPath (ключ), якщо є;
2. знайди прецеденти вжитку в корпусі: rg -i -l "<термін>" по ${repo}/src/lib/generated/*.json, ${repo}/data/2014, ${repo}/data/2024, ${repo}/data/5etools/translations, ${repo}/prisma/seed — і випиши, як його там передано українською (form + where: файл);
3. запропонуй suggested — форму для перекладу: словник > прецедент > власний варіант за правилами транслітерації з ${rulesPath} (розділ 2). Коли словник і корпус розходяться — suggested = словник, а розбіжність опиши в why.

Терміни з інших файлів цього самого списку не пропускай, навіть якщо здаються очевидними. Поверни лише структурований результат.`,
    { label: `scout:${index + 1}`, phase: 'Glossary', schema: TERMS_SCHEMA },
  ),
))

const merged = new Map()
for (const result of scouted.filter(Boolean)) {
  for (const term of result.terms) {
    const key = term.term.trim().toLowerCase()
    const existing = merged.get(key) || { term: term.term.trim(), categories: new Set(), dictionaryForms: new Set(), dictionaryPaths: new Set(), precedents: [], suggested: [], why: [] }
    existing.categories.add(term.category)
    if (term.dictionaryForm) existing.dictionaryForms.add(term.dictionaryForm)
    if (term.dictionaryPath) existing.dictionaryPaths.add(term.dictionaryPath)
    existing.precedents.push(...(term.precedents || []))
    existing.suggested.push(term.suggested)
    if (term.why) existing.why.push(term.why)
    merged.set(key, existing)
  }
}
const mergedList = [...merged.values()].map((entry) => ({
  term: entry.term,
  categories: [...entry.categories],
  dictionaryForms: [...entry.dictionaryForms],
  dictionaryPaths: [...entry.dictionaryPaths],
  precedents: entry.precedents.slice(0, 8),
  suggested: [...new Set(entry.suggested)],
  why: [...new Set(entry.why)].slice(0, 3),
}))
log(`Зведено ${mergedList.length} термінів; суддя пише глосарій`)

glossaryReport = await agent(
  `${common}

Ти — суддя термінології. Нижче зведений список термінів від розвідників (JSON); попередній прогін 2026-09-18 зібрав ще 668 термінів у ${scoutedPath} — прочитай і його, обʼєднай із цим списком. Для кожного терміна ухвали ОДНУ остаточну українську форму за пріоритетом: (1) словникова форма dictionary.json — якщо є, вона перемагає завжди; (2) прецедент корпусу — коли словника немає, а корпус одностайний; (3) власна форма за правилами транслітерації й перекладу з ${rulesPath}. Сумнівні терміни звір із dictionary.json сам (rg), не довіряй розвідникам наосліп. Стеж за узгодженістю споріднених термінів (Githyanki/Githzerai/Gith → Ґітьянкі/Ґітзераї/Ґіт; Abyss/Abyssal; Nine Hells/infernal).

Запиши глосарій у файл ${glossaryPath} як JSON-масив обʼєктів {"term","form","basis":"dictionary"|"precedent"|"new","marker":true|false,"note"} — marker=true, коли термін у прозі має нести маркер оригіналу на першій згадці (усе транслітероване, власні назви, вибір із синонімів), marker=false для станів, типів шкоди, розмірів і базових термінів правил. Відсортуй за term.

Поверни підсумок: скільки термінів, скільки зі словника, скільки з прецедентів, список newTerms (basis=new) і conflicts — терміни, де словник і корпус розходяться (термін: словник ↔ корпус).

Список:
${JSON.stringify(mergedList)}`,
  { label: 'glossary-judge', phase: 'Glossary', schema: GLOSSARY_SCHEMA },
)
log(`Глосарій: ${glossaryReport ? glossaryReport.total : 0} термінів, нових ${glossaryReport ? glossaryReport.newTerms.length : '?'}, конфліктів ${glossaryReport ? glossaryReport.conflicts.length : '?'}`)
}

const BATCH_TRANSLATION_SCHEMA = {
  type: 'object',
  properties: { groups: { type: 'array', items: TRANSLATION_SCHEMA } },
  required: ['groups'],
}

function splitIntoBatches(items) {
  const batches = []
  let current = []
  let words = 0
  for (const item of items) {
    if (current.length > 0 && words + item.words > batchWords) {
      batches.push(current)
      current = []
      words = 0
    }
    current.push(item)
    words += item.words
  }
  if (current.length > 0) batches.push(current)
  return batches
}

const listBatch = (batch) => batch.map((item) => `- «${item.engName}» (${item.edition}, ${item.words} слів): вхід ${inputFile(item)} → результат ${outFile(item)}; key "${item.key}"`).join('\n')

const batchTranslatePrompt = (batch) => `${common}
Глосарій KR33.8 (терміни брати як є): ${glossaryPath}.

Переклади українською вступи до ${batch.length} груп істот — кожну окремим файлом:
${listBatch(batch)}

1. Прочитай ${rulesPath} повністю — це формат даних, а не побажання.
2. Прочитай ${glossaryPath}.
3. Для кожної групи прочитай вхід: engName, source, sourceSections, members (істоти групи з українськими назвами каталогу в uk), references, markdown (англійський текст).
4. Переклади markdown кожної групи повністю — абзац за абзацом, зі збереженням заголовків, списків, таблиць, цитат; маркери оригіналу за розділом 3 правил; терміни — словник → глосарій → каталог істот → newTerms. Однакові терміни в різних групах пачки — однаковою формою.
5. Запиши кожен результат у свій файл як JSON {"key","edition","engName","name","description","newTerms"}.
6. Поверни звіт groups: для кожної групи key, кількість слів у description, newTerms.`

const batchVerifyPrompt = (batch) => `${common}
Глосарій: ${glossaryPath}. Пари «вхід → переклад» (поле markdown входу проти полів name і description перекладу):
${listBatch(batch)}

Ти — прискіпливий редактор перекладу D&D. Для КОЖНОЇ пари спробуй спростувати дві речі.
А. Повнота й точність: пропущені речення, абзаци, пункти списків, рядки чи стовпці таблиць, епіграфи; дописане від себе; змінений зміст (числа, хто кому що робить, назви істот); переказ замість перекладу; зламана структура.
Б. Домашні правила ${rulesPath}: апостроф лише ʼ (U+02BC); маркери оригіналу на першій згадці обраних термінів, без пробілу перед {{, латиниця всередині, парна форма, коли українських слів більше, заголовки **Назва{{Original}}**, жодних маркерів на станах і типах шкоди; терміни словника й глосарію саме так (найпідозріліші перевір rg); назви істот із members/references (uk); назви заклинань «Назва [English]» з SPELLS; без HTML; природна сучасна українська без русизмів, кальок і канцеляриту; name — коротка назва групи в називному множини.
refuted=true лише за конкретним доказом. У кожній проблемі where починай з key групи в квадратних дужках, далі цитата; issue — що не так; fix — точна заміна українською. Без доказів — refuted=false і порожній список.`

const batchFixPrompt = (batch, problems) => `${common}
Виправ переклади за списком проблем нижче. Файли пачки:
${listBatch(batch)}
Глосарій: ${glossaryPath}. Проблема належить групі, чий key стоїть у квадратних дужках на початку where. Правки точкові, решту тексту не переписувати. Якщо проблема хибна (суперечить правилам чи джерелу) — пропусти й поясни в skipped. Кожен файл лишити валідним JSON із тими самими полями.
Проблеми:
${JSON.stringify(problems)}`

async function translateInBatches() {
  const batches = splitIntoBatches(inputs)
  log(`Пачок: ${batches.length} (≤${batchWords} слів)`)
  const perBatch = await pipeline(
    batches,
    (batch) => agent(batchTranslatePrompt(batch), { label: `translate-batch:${batches.indexOf(batch) + 1}`, phase: 'Translate', schema: BATCH_TRANSLATION_SCHEMA }),
    async (translation, batch) => {
      const index = batches.indexOf(batch)
      if (!translation) return batch.map((item) => ({ key: item.key, edition: item.edition, ok: false, newTerms: [], rounds: 0, problems: 0 }))
      const verdict = await agent(batchVerifyPrompt(batch), { label: `verify-batch:${index + 1}`, phase: 'Verify', schema: VERDICT_SCHEMA })
      const problems = verdict && verdict.refuted ? verdict.problems : []
      if (problems.length > 0) await agent(batchFixPrompt(batch, problems), { label: `fix-batch:${index + 1}`, phase: 'Fix', schema: FIX_SCHEMA })
      return batch.map((item) => {
        const report = translation.groups.find((group) => group.key === item.key)
        const own = problems.filter((problem) => problem.where.includes(`[${item.key}]`)).length
        return { key: item.key, edition: item.edition, ok: Boolean(report), words: report ? report.words : 0, newTerms: report ? report.newTerms : [], rounds: own > 0 ? 1 : 0, problems: own, unresolved: 0 }
      })
    },
  )
  return perBatch.filter(Boolean).flat()
}

// ---------- Phases 2–4: translate → verify → fix, per group ----------
const translatePrompt = (item) => `${common}
Глосарій KR33.8 (терміни брати як є): ${glossaryPath}.

Переклади вступ до групи істот «${item.engName}» (${item.edition}, ${item.words} слів) українською.
1. Прочитай ${rulesPath} повністю — це формат даних, а не побажання.
2. Прочитай ${glossaryPath}.
3. Прочитай вхід ${inputFile(item)}: engName, source, sourceSections, members (істоти групи з українськими назвами каталогу в uk), references (згадані істоти/заклинання/стани з українськими формами), markdown (англійський текст).
4. Переклади markdown повністю — абзац за абзацом, зі збереженням заголовків, списків, таблиць, цитат; маркери оригіналу за розділом 3 правил; терміни — словник → глосарій → каталог істот → newTerms.
5. Запиши результат у ${outFile(item)} як JSON {"key":"${item.key}","edition":"${item.edition}","engName":"${item.engName}","name":"…","description":"…","newTerms":[…]}.
6. Поверни звіт: key, кількість слів у description, newTerms.`

const fidelityPrompt = (item) => `Ти — прискіпливий редактор-звірник перекладу D&D. Джерело: поле "markdown" у ${inputFile(item)}. Переклад: поле "description" у ${outFile(item)} (і "name" — назва групи).
Порівняй абзац за абзацом і спробуй СПРОСТУВАТИ, що це повний і точний переклад. Шукай: пропущені речення, абзаци, пункти списків, рядки або стовпці таблиць, епіграфи; дописане від себе; змінений зміст (числа, хто кому що робить, назви істот, напрямок причини-наслідку); переказ замість перекладу; зламану структуру (заголовки не там, список став абзацом, таблиця без заголовка). Стиль і вибір термінів — не твоя лінза, лише зміст і повнота.
refuted=true лише за конкретним доказом: у кожній проблемі where — цитата з джерела, issue — що не так, fix — як має бути українською. Без доказів — refuted=false і порожній список.`

const stylePrompt = (item) => `${common}
Глосарій: ${glossaryPath}. Вхід із назвами істот (members/references): ${inputFile(item)}. Переклад: ${outFile(item)} (поля name і description).
Ти — редактор домашнього стилю. Спробуй СПРОСТУВАТИ, що переклад відповідає правилам ${rulesPath}. Перевір по пунктах: апостроф лише ʼ (U+02BC); маркери оригіналу — на першій згадці обраних термінів, без пробілу перед {{, латиниця всередині, кількість слів/парна форма, заголовки підрозділів **Назва{{Original}}**, ЖОДНИХ маркерів на станах і типах шкоди; терміни зі словника dictionary.json і глосарію вжито саме так (перевір rg найпідозріліші); назви істот — з members/references (uk), без дужкових транслітерацій; назви заклинань «Назва [English]» з SPELLS; без HTML; без англійських слів поза маркерами й назвами заклинань; природна сучасна українська без русизмів, кальок і канцеляриту; name — коротка назва групи в називному множини зі словника або назв істот.
refuted=true лише за конкретними проблемами: where — цитата з перекладу, issue — правило, fix — точна заміна. Без проблем — refuted=false.`

const fixPrompt = (item, problems) => `${common}
Виправ переклад у ${outFile(item)} (поля description і name) за списком проблем нижче. Джерело для звірки: поле markdown у ${inputFile(item)}; глосарій: ${glossaryPath}. Правки — точкові, решту тексту не переписувати. Якщо проблема хибна (суперечить правилам чи джерелу) — пропусти й поясни в skipped. Файл лишити валідним JSON із тими самими полями.
Проблеми:
${JSON.stringify(problems)}`

const verifyBoth = (item, round) => parallel([
  () => agent(fidelityPrompt(item), { label: `fidelity${round}:${item.edition === 'RULES_2024' ? '24' : '14'}/${item.key}`, phase: 'Verify', schema: VERDICT_SCHEMA }),
  () => agent(stylePrompt(item), { label: `style${round}:${item.edition === 'RULES_2024' ? '24' : '14'}/${item.key}`, phase: 'Verify', schema: VERDICT_SCHEMA }),
])

const results = batchWords ? await translateInBatches() : await pipeline(
  inputs,
  (item) => agent(translatePrompt(item), { label: `translate:${item.edition === 'RULES_2024' ? '24' : '14'}/${item.key}`, phase: 'Translate', schema: TRANSLATION_SCHEMA }),
  async (translation, item) => {
    if (!translation) return { key: item.key, edition: item.edition, ok: false, newTerms: [], rounds: 0, problems: 0 }
    let problems = []
    let rounds = 0
    let totalProblems = 0
    for (let round = 1; round <= 2; round += 1) {
      const verdicts = (await verifyBoth(item, round)).filter(Boolean)
      problems = verdicts.flatMap((verdict) => (verdict.refuted ? verdict.problems : []))
      if (problems.length === 0) break
      rounds += 1
      totalProblems += problems.length
      await agent(fixPrompt(item, problems), { label: `fix${round}:${item.edition === 'RULES_2024' ? '24' : '14'}/${item.key}`, phase: 'Fix', schema: FIX_SCHEMA })
    }
    return { key: item.key, edition: item.edition, ok: true, words: translation.words, newTerms: translation.newTerms, rounds, problems: totalProblems, unresolved: problems.length }
  },
)

const done = results.filter(Boolean)
log(`Перекладено ${done.filter((r) => r.ok).length}/${inputs.length}; правок потребували ${done.filter((r) => r.rounds > 0).length}; нерозвʼязаних після двох раундів: ${done.filter((r) => r.unresolved > 0).length}`)

// ---------- Phase 5: consistency sweep (needs all translations) ----------
phase('Sweep')
const SWEEP_CHUNK = 14
const sweepChunks = []
const okItems = inputs.filter((item) => done.some((r) => r.key === item.key && r.edition === item.edition && r.ok))
for (let i = 0; i < okItems.length; i += SWEEP_CHUNK) sweepChunks.push(okItems.slice(i, i + SWEEP_CHUNK))

const sweeps = await parallel(sweepChunks.map((chunk, index) => () =>
  agent(
    `${common}
Глосарій: ${glossaryPath}. Файли перекладів (поля name і description):
${chunk.map((item) => `- ${outFile(item)}`).join('\n')}

Ти — звірник узгодженості. Прочитай глосарій і всі файли. Знайди: (1) термін глосарію, переданий не глосарійною формою (у будь-якому відмінку — це не проблема; інший корінь чи інша транслітерація — проблема); (2) власну назву, яка в різних файлах транслітерована по-різному (перелічи всі файли, де є розбіжність, і назви одну правильну форму — за глосарієм або словником); (3) назву групи name, що не узгоджена з іншими (наприклад, «Дракони» і «Червоні Дракони» з великої посеред назви); (4) маркер оригіналу на терміні, який глосарій позначив marker=false, або його відсутність на першій згадці терміна з marker=true. Кожну проблему — з file, where (цитата), issue, fix (точна заміна). Нічого не правити самому.`,
    { label: `sweep:${index + 1}`, phase: 'Sweep', schema: SWEEP_SCHEMA },
  ),
))

const sweepProblems = sweeps.filter(Boolean).flatMap((s) => s.problems)
const byFile = new Map()
for (const problem of sweepProblems) byFile.set(problem.file, [...(byFile.get(problem.file) || []), problem])
log(`Звірка: ${sweepProblems.length} проблем у ${byFile.size} файлах`)

const sweepFixes = await parallel([...byFile.entries()].map(([file, problems]) => () =>
  agent(
    `${common}
Виправ переклад у файлі ${file} (поля description і name) за списком проблем узгодженості нижче. Глосарій: ${glossaryPath}. Правки точкові; якщо проблема хибна — пропусти й поясни в skipped. Файл лишити валідним JSON із тими самими полями.
Проблеми:
${JSON.stringify(problems)}`,
    { label: `sweep-fix:${file.split('/').slice(-2).join('/')}`, phase: 'Sweep', schema: FIX_SCHEMA },
  ),
))

return {
  glossary: glossaryReport,
  translated: done.filter((r) => r.ok).length,
  failed: inputs.filter((item) => !done.some((r) => r.key === item.key && r.edition === item.edition && r.ok)).map((item) => `${item.edition}/${item.key}`),
  fixedGroups: done.filter((r) => r.rounds > 0).map((r) => `${r.edition}/${r.key}:${r.problems}`),
  unresolved: done.filter((r) => r.unresolved > 0).map((r) => `${r.edition}/${r.key}:${r.unresolved}`),
  newTerms: [...new Map(done.flatMap((r) => r.newTerms).map((t) => [t.term.toLowerCase(), t])).values()],
  sweepProblems: sweepProblems.length,
  sweepApplied: sweepFixes.filter(Boolean).reduce((total, fix) => total + fix.applied, 0),
}