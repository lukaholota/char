/// Речення, а не 40 символів навколо: партія читає й переписує цілу фразу, тому діф має
/// показувати рівно ту одиницю, з якою працює людина. HTML-теги бестіарію рвуть речення
/// не гірше за крапку, тож вони теж межа.
export function findSentence(text: string, form: string): string {
  const plain = text.replace(/<[^>]+>/gu, " ");
  const position = plain.indexOf(form);
  if (position === -1) return plain.trim();

  const start = findBoundaryBefore(plain, position);
  const end = findBoundaryAfter(plain, position + form.length);
  return plain.slice(start, end).replace(/\s+/gu, " ").trim();
}

function findBoundaryBefore(text: string, position: number): number {
  for (let index = position; index > 0; index--) {
    if (/[.!?]/u.test(text[index - 1]) && /\s/u.test(text[index] ?? "")) return index;
  }
  return 0;
}

function findBoundaryAfter(text: string, position: number): number {
  for (let index = position; index < text.length; index++) {
    if (/[.!?]/u.test(text[index])) return index + 1;
  }
  return text.length;
}
