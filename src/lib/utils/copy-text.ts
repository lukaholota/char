export type CopyMethod = "clipboard_api" | "selection";

export async function copyTextToClipboard(text: string): Promise<CopyMethod | null> {
  if (await writeWithClipboardApi(text)) return "clipboard_api";
  return copyWithHiddenSelection(text) ? "selection" : null;
}

async function writeWithClipboardApi(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function copyWithHiddenSelection(text: string): boolean {
  if (typeof document === "undefined" || typeof document.execCommand !== "function") return false;
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  try {
    field.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}
