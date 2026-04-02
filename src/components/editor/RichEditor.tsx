"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  Italic,
  Strikethrough,
  Underline as UnderlineIcon,
  Highlighter,
  Minus,
  List,
  ListOrdered,
  Quote,
  Code as CodeIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Smile,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const low = createLowlight(common);

type Variant = "full" | "simple" | "comment";

const EMOJI_LIST = [
  "😀", "😂", "😍", "🥰", "😎", "🤔", "😢", "😡", "🥳", "🤩",
  "👍", "👎", "👏", "🙌", "🔥", "❤️", "💯", "✨", "⭐", "🎉",
  "😱", "🤣", "😏", "🙄", "😴", "🤗", "😇", "🤯", "💀", "👀",
];

export default function RichEditor({
  name,
  initialHTML = "",
  placeholder = "Ecrivez ici... (Ctrl+B/I, Ctrl+K pour lien, etc.)",
  variant = "full",
  onChange,
}: {
  name: string;
  initialHTML?: string;
  placeholder?: string;
  variant?: Variant;
  onChange?: (html: string) => void;
}) {
  const hiddenRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [html, setHtml] = useState<string>(initialHTML || "");
  const [showEmojis, setShowEmojis] = useState(false);

  const extensions: any[] = [
    StarterKit.configure({
      codeBlock: false,
      bold: variant === "comment" ? false : undefined,
      italic: variant === "comment" ? false : undefined,
      strike: variant === "comment" ? false : undefined,
      blockquote: variant === "comment" ? false : undefined,
      bulletList: variant === "comment" ? false : undefined,
      orderedList: variant === "comment" ? false : undefined,
      heading: variant === "comment" ? false : undefined,
    }),
    Placeholder.configure({ placeholder }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    ...(variant !== "comment" ? [
      Underline,
      Link.configure({ openOnClick: true, autolink: true, linkOnPaste: true }),
    ] : []),
  ];

  if (variant === "full") {
    extensions.push(
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Image.configure({ allowBase64: true }),
      TaskList,
      TaskItem,
      CodeBlockLowlight.configure({ lowlight: low })
    );
  }

  const editor = useEditor({
    extensions,
    content: initialHTML || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const h = editor.getHTML();
      setHtml(h);
      if (hiddenRef.current) hiddenRef.current.value = h;
      onChange?.(h);
    },
    editorProps: {
      attributes: {
        class:
          `prose prose-invert max-w-none ${variant === "comment" ? "min-h-[100px]" : "min-h-[200px]"} rounded-md border border-[color:var(--bg-800)] bg-[color:var(--bg-600)] p-3 focus:outline-none`,
      },
    },
  });

  useEffect(() => {
    if (editor && initialHTML) editor.commands.setContent(initialHTML);
  }, [editor, initialHTML]);

  const toggle = (cmd: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    cmd();
  };

  return (
    <div className="space-y-2">
      <input ref={hiddenRef} type="hidden" name={name} defaultValue={html} />

      <div className="flex flex-wrap items-center gap-1 text-xs rounded-md border border-[color:var(--bg-800)] bg-[color:var(--bg-700)] p-2">
        {variant !== "comment" && (
          <>
            <ToolbarButton active={editor?.isActive("bold")} label="Gras (Ctrl+B)" onClick={toggle(() => editor?.chain().focus().toggleBold().run())}>
              <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor?.isActive("italic")} label="Italique (Ctrl+I)" onClick={toggle(() => editor?.chain().focus().toggleItalic().run())}>
              <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>
          </>
        )}
        {variant === "full" && (
          <>
            <ToolbarButton active={editor?.isActive("strike")} label="Barré" onClick={toggle(() => editor?.chain().focus().toggleStrike().run())}>
              <Strikethrough className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor?.isActive("underline")} label="Souligné" onClick={toggle(() => editor?.chain().focus().toggleUnderline().run())}>
              <UnderlineIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor?.isActive("highlight")} label="Surlignage" onClick={toggle(() => editor?.chain().focus().toggleHighlight().run())}>
              <Highlighter className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton label="Règle" onClick={toggle(() => editor?.chain().focus().setHorizontalRule().run())}>
              <Minus className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor?.isActive("bulletList")} label="Liste" onClick={toggle(() => editor?.chain().focus().toggleBulletList().run())}>
              <List className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor?.isActive("orderedList")} label="Liste numérotée" onClick={toggle(() => editor?.chain().focus().toggleOrderedList().run())}>
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor?.isActive("blockquote")} label="Citation" onClick={toggle(() => editor?.chain().focus().toggleBlockquote().run())}>
              <Quote className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton active={editor?.isActive("codeBlock")} label="Bloc code" onClick={toggle(() => editor?.chain().focus().toggleCodeBlock().run())}>
              <CodeIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton label="Image (upload)" onClick={(e) => {
              e.preventDefault();
              fileInputRef.current?.click();
            }}>
              <ImageIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !editor) return;
                e.target.value = '';
                try {
                  const formData = new FormData();
                  formData.set('file', file);
                  const res = await fetch('/api/upload/image', { method: 'POST', body: formData });
                  const data = await res.json();
                  if (data?.url) {
                    editor.chain().focus().setImage({ src: data.url }).run();
                  } else {
                    const fallbackUrl = prompt("Upload échoué. Coller l'URL de l'image manuellement :");
                    if (fallbackUrl) editor.chain().focus().setImage({ src: fallbackUrl }).run();
                  }
                } catch {
                  const fallbackUrl = prompt("Erreur réseau. Coller l'URL de l'image manuellement :");
                  if (fallbackUrl) editor.chain().focus().setImage({ src: fallbackUrl }).run();
                }
              }}
            />
            <ToolbarButton active={editor?.isActive("link")} label="Lien (Ctrl+K)" onClick={(e) => { e.preventDefault(); const url = prompt("URL du lien"); if (url) editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run(); }}>
              <LinkIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
          </>
        )}
        {/* Align */}
        <ToolbarButton active={editor?.isActive({ textAlign: "left" })} label="Aligner à gauche" onClick={toggle(() => editor?.chain().focus().setTextAlign("left").run())}>
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive({ textAlign: "center" })} label="Centrer" onClick={toggle(() => editor?.chain().focus().setTextAlign("center").run())}>
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive({ textAlign: "right" })} label="Aligner à droite" onClick={toggle(() => editor?.chain().focus().setTextAlign("right").run())}>
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarButton>

        {/* Emoji picker */}
        <div className="relative ml-auto">
          <ToolbarButton active={showEmojis} label="Emoji" onClick={(e) => { e.preventDefault(); setShowEmojis((v) => !v); }}>
            <Smile className="h-3.5 w-3.5" />
          </ToolbarButton>
          {showEmojis && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowEmojis(false)} />
              <div className="absolute bottom-full right-0 z-50 mb-2 grid w-[280px] grid-cols-10 gap-0.5 rounded-lg border border-[color:var(--bg-600)] bg-[color:var(--bg-900)] p-2.5 shadow-2xl">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-lg leading-none transition-colors hover:bg-[color:var(--bg-600)]"
                    onClick={() => {
                      editor?.chain().focus().insertContent(emoji).run();
                      setShowEmojis(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

function btn(active?: boolean) {
  return `px-2 py-1 border border-[color:var(--bg-800)] rounded-sm ${active ? "bg-white text-black" : "hover:bg-white hover:text-black"}`;
}

function ToolbarButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: (e: any) => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button aria-label={label} onClick={onClick} className={btn(active)}>
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}
