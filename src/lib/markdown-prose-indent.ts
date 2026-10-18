const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s/;

// Seed descriptions are template literals indented with the code, and markdown turns a paragraph indented by 4+ spaces into a code block.
export function stripProseIndent(markdown: string): string {
  return markdown
    .split(/(```[\s\S]*?```)/)
    .map((part, index) => (index % 2 === 1 ? part : part.split("\n").map(stripLineIndent).join("\n")))
    .join("");
}

function stripLineIndent(line: string): string {
  return LIST_ITEM.test(line) ? line : line.trimStart();
}
