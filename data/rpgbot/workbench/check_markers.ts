import { readFileSync } from "node:fs";
import { splitGlossaryMarkers, type GlossarySegment } from "@/lib/refs/glossary-marker";

const fragments: Record<string, string> = JSON.parse(readFileSync(process.argv[2], "utf-8"));
const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
const isFollowingMarkup = (previous?: GlossarySegment) => previous !== undefined && /[\]*_^]$/.test(previous.text.trimEnd());
const isEmptyMarker = (segment: GlossarySegment, previous?: GlossarySegment) =>
  segment.text === segment.original && previous !== undefined && !isFollowingMarkup(previous);
let flagged = 0;
for (const [key, text] of Object.entries(fragments)) {
  const withoutPaired = text.replace(/\{\{[^{}|]+\|[^{}]+\}\}/g, "");
  const segments = splitGlossaryMarkers(withoutPaired);
  segments.forEach((segment, index) => {
    if (segment.original === undefined) return;
    if (isEmptyMarker(segment, segments[index - 1])) {
      flagged += 1;
      console.log(`${key}\n   marker covers no Ukrainian word: ${segment.original}  (put it right after the word or use {{Назва|English}})`);
      return;
    }
    if (segment.text.trim().endsWith("»")) return;
    const covered = wordCount(segment.text);
    const wanted = wordCount(segment.original);
    if (covered !== wanted) {
      flagged += 1;
      console.log(`${key}\n   «${segment.text}» ← ${segment.original}  (covered ${covered}, original ${wanted})`);
    }
  });
}
console.log(`flagged: ${flagged}`);
