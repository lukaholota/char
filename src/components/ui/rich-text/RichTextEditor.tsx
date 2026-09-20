"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { Markdown } from "@tiptap/markdown";
import { Placeholder } from "@tiptap/extensions";
import { Bold, Italic, List, ListOrdered, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { restoreTypedCharacters, RICH_TEXT_EXTENSIONS } from "./rich-text-markdown";

type Props = {
  id?: string;
  value: string;
  onChange: (markdown: string) => void;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  isInvalid?: boolean;
  placeholder?: string;
  contentClassName?: string;
  isToolbarSticky?: boolean;
};

export function RichTextEditor({ id, value, onChange, ariaLabel, ariaDescribedBy, isInvalid, placeholder, contentClassName, isToolbarSticky }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [...RICH_TEXT_EXTENSIONS, Markdown, Placeholder.configure({ placeholder: placeholder ?? "" })],
    content: value,
    contentType: "markdown",
    editorProps: { attributes: buildContentAttributes({ id, ariaLabel, ariaDescribedBy, contentClassName }) },
    onUpdate: ({ editor: updated }) => onChange(restoreTypedCharacters(updated.getMarkdown())),
  });

  /// `overflow-hidden` на предку вбиває `sticky`, тож рамка ріже кути лише без липкої панелі.
  return (
    <div className={cn("rounded-lg border border-white/10 bg-slate-950/50 focus-within:ring-1 focus-within:ring-amber-400/40", !isToolbarSticky && "overflow-hidden", isInvalid && "border-rose-400/60")}>
      {editor ? <RichTextToolbar editor={editor} isSticky={isToolbarSticky} /> : null}
      <EditorContent editor={editor} />
    </div>
  );
}

function buildContentAttributes({ id, ariaLabel, ariaDescribedBy, contentClassName }: Pick<Props, "id" | "ariaLabel" | "ariaDescribedBy" | "contentClassName">) {
  return {
    ...(id ? { id } : {}),
    ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
    ...(ariaDescribedBy ? { "aria-describedby": ariaDescribedBy } : {}),
    role: "textbox",
    "aria-multiline": "true",
    class: cn(
      "min-h-24 px-3 py-2 text-base leading-relaxed text-slate-100 outline-none sm:text-sm",
      "[&_p]:mb-2 [&_p:last-child]:mb-0 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-semibold [&_strong]:text-arcane-400",
      "[&_h1]:mb-2 [&_h2]:mb-2 [&_h3]:mb-2 [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_blockquote]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:border-white/20 [&_blockquote]:pl-3 [&_table]:mb-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-600 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-slate-600 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left",
      "[&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-slate-500 [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
      contentClassName,
    ),
  };
}

function RichTextToolbar({ editor, isSticky }: { editor: Editor; isSticky?: boolean }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      bulletList: current.isActive("bulletList"),
      orderedList: current.isActive("orderedList"),
    }),
  });

  return (
    <div
      className={cn(
        "flex gap-1 rounded-t-lg border-b border-white/10 bg-white/[0.03] p-1",
        isSticky && "sticky top-0 z-20 bg-slate-900/95 backdrop-blur",
      )}
      role="toolbar"
      aria-label="Форматування"
    >
      <ToolbarButton icon={Bold} label="Жирний" isActive={active.bold} onPress={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarButton icon={Italic} label="Курсив" isActive={active.italic} onPress={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarButton icon={List} label="Список" isActive={active.bulletList} onPress={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolbarButton icon={ListOrdered} label="Нумерований список" isActive={active.orderedList} onPress={() => editor.chain().focus().toggleOrderedList().run()} />
    </div>
  );
}

function ToolbarButton({ icon: Icon, label, isActive, onPress }: { icon: LucideIcon; label: string; isActive: boolean; onPress: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={isActive}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onPress}
      className={cn("flex h-10 w-10 items-center justify-center rounded-md transition sm:h-8 sm:w-8", isActive ? "bg-amber-500/20 text-amber-100" : "text-slate-300 hover:bg-white/10")}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}
