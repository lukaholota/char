/**
 * SEO Utility functions for clean metadata generation.
 */

/**
 * Strips markdown and HTML-like tags from a string to make it safe for meta tags.
 */
export function stripMarkdown(text: string): string {
  if (!text) return "";

  return text
    // Replace markdown links [text](url) with just text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Replace bold/italic (**text**, __text__, *text*, _text_)
    .replace(/(\*\*|__|\*|_)(.*?)\1/g, "$2")
    // Remove HTML tags
    .replace(/<[^>]*>/g, "")
    // Remove excessive whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Creates a clean snippet of text for SEO descriptions.
 */
export function getDescriptionSnippet(text: string, maxLength: number = 160): string {
  if (!text) return "";

  const cleanText = stripMarkdown(text);
  
  if (cleanText.length <= maxLength) {
    return cleanText;
  }

  // Try to cut at a space
  const snippet = cleanText.slice(0, maxLength);
  const lastSpace = snippet.lastIndexOf(" ");
  
  if (lastSpace > maxLength * 0.8) {
    return snippet.slice(0, lastSpace).trim() + "...";
  }
  
  return snippet.trim() + "...";
}
