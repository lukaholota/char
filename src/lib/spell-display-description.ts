const METADATA_LABELS = ["Час створення:", "Відстань:", "Складові:", "Тривалість:"];

export function buildSpellDisplayDescription(description: string, engName: string): string {
  let displayed = description;

  if (engName === "Gift of Gab") {
    const intro = displayed.match(/^\s*<p><em>«Коли я познайомилася з Джимом Даркмеджиком[\s\S]*?<\/p>\s*<p>Кажуть, що це заклинання винайшов Джим Даркмеджик[\s\S]*?<\/p>/i);
    if (intro) displayed = displayed.slice(intro[0].length);
  }

  const firstParagraph = displayed.match(/^\s*<p>[\s\S]*?<\/p>/i);
  if (firstParagraph && METADATA_LABELS.every((label) => firstParagraph[0].includes(label))) {
    displayed = displayed.slice(firstParagraph[0].length);
  }

  return displayed.trim();
}
