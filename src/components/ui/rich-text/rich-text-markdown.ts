import { decodeHtmlEntities, type AnyExtension } from "@tiptap/core";
import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";

export const RICH_TEXT_EXTENSIONS: AnyExtension[] = [
  StarterKit.configure({
    underline: false,
    link: { openOnClick: false, autolink: false, linkOnPaste: false },
  }),
  TableKit.configure({ table: { resizable: false } }),
];

export function restoreTypedCharacters(editorMarkdown: string): string {
  return decodeHtmlEntities(editorMarkdown);
}
