"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  DoorOpen,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const low = createLowlight(common);

// Couleurs alignées sur globals.css → .article-content h1..h6
// (vert / orange / bleu / rouge / violet / noir)
const HEADING_BUTTONS: {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  color: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { level: 1, color: "#0FD42F", label: "Titre 1 (vert)", Icon: Heading1 },
  { level: 2, color: "#FFAF00", label: "Titre 2 (orange)", Icon: Heading2 },
  { level: 3, color: "#2976E8", label: "Titre 3 (bleu)", Icon: Heading3 },
  { level: 4, color: "#E11036", label: "Titre 4 (rouge)", Icon: Heading4 },
  { level: 5, color: "#141433", label: "Titre 5 (violet)", Icon: Heading5 },
  { level: 6, color: "#000000", label: "Titre 6 (noir)", Icon: Heading6 },
];

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
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

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
        // En variant "full" on applique article-content : les <h1>..<h6>
        // s'affichent immédiatement avec leur bandeau coloré (WYSIWYG),
        // identique au rendu de la page publique.
        class:
          `${variant === "full" ? "article-content " : ""}max-w-none ${variant === "comment" ? "min-h-[100px]" : "min-h-[200px]"} rounded-md border border-[color:var(--bg-800)] bg-[color:var(--bg-600)] p-3 focus:outline-none`,
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
            {/* ── Titres colorés H1..H6 (bandeaux pleine largeur) ─── */}
            {HEADING_BUTTONS.map(({ level, color, label, Icon }) => (
              <ToolbarButton
                key={level}
                active={editor?.isActive("heading", { level })}
                label={label}
                onClick={toggle(() => editor?.chain().focus().toggleHeading({ level }).run())}
              >
                <span className="relative inline-flex h-3.5 w-3.5 items-center justify-center">
                  <Icon className="h-3.5 w-3.5" />
                  <span
                    className="absolute -bottom-1 left-1/2 h-1 w-3 -translate-x-1/2 rounded-[1px]"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                </span>
              </ToolbarButton>
            ))}
            <div className="mx-1 h-4 w-px bg-[color:var(--bg-600)]" aria-hidden />
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
            <ToolbarButton active={editor?.isActive("link")} label="Lien (Ctrl+K)" onClick={(e) => { e.preventDefault(); setLinkUrl(editor?.getAttributes("link")?.href || ""); setShowLinkModal(true); }}>
              <LinkIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              label="Insérer une RoomID Habbo"
              onClick={(e) => {
                e.preventDefault();
                const raw = prompt("ID de la room Habbo (chiffres uniquement) :");
                if (!raw) return;
                const id = raw.trim().replace(/[^0-9]/g, "");
                if (!id) return;
                // Le HTML inséré sera reconnu côté lecture par RoomIdClickHandler
                // qui copiera ":roomid <id>" au clic. data-roomid garde l'ID
                // intact même si l'admin édite ensuite le texte affiché.
                const chip = `<a href="#roomid-${id}" data-roomid="${id}" class="roomid-chip" rel="nofollow noopener">:roomid ${id}</a>&nbsp;`;
                editor?.chain().focus().insertContent(chip).run();
              }}
            >
              <DoorOpen className="h-3.5 w-3.5" />
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

      {/* ProseMirror content styles — remplace le plugin @tailwindcss/typography absent */}
      <style>{`
        .ProseMirror { color: #fff; line-height: 1.65; }
        .ProseMirror:focus { outline: none; }
        .ProseMirror > * + * { margin-top: 0.6em; }

        /* Placeholder */
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgba(190,190,206,0.35);
          pointer-events: none;
          height: 0;
        }

        /* Headings */
        .ProseMirror h1 { font-size: 1.6em; font-weight: 700; line-height: 1.2; margin-top: 1em; }
        .ProseMirror h2 { font-size: 1.35em; font-weight: 700; line-height: 1.25; margin-top: 0.9em; }
        .ProseMirror h3 { font-size: 1.15em; font-weight: 700; line-height: 1.3; margin-top: 0.8em; }

        /* Lists — bullet */
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin-top: 0.4em;
          margin-bottom: 0.4em;
        }
        .ProseMirror ul ul { list-style-type: circle; }
        .ProseMirror ul ul ul { list-style-type: square; }

        /* Lists — ordered */
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5em;
          margin-top: 0.4em;
          margin-bottom: 0.4em;
        }
        .ProseMirror ol ol { list-style-type: lower-alpha; }
        .ProseMirror ol ol ol { list-style-type: lower-roman; }

        /* List items */
        .ProseMirror li {
          display: list-item;
          margin-top: 0.15em;
          margin-bottom: 0.15em;
        }
        .ProseMirror li p { margin: 0; }
        .ProseMirror li > ul,
        .ProseMirror li > ol { margin-top: 0.2em; }

        /* Blockquote */
        .ProseMirror blockquote {
          border-left: 3px solid #2596FF;
          padding-left: 1em;
          margin-left: 0;
          margin-right: 0;
          margin-top: 0.6em;
          margin-bottom: 0.6em;
          color: rgba(190,190,206,0.8);
          font-style: italic;
        }
        .ProseMirror blockquote p { margin: 0; }

        /* Horizontal rule */
        .ProseMirror hr {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.1);
          margin: 1em 0;
        }

        /* Code inline */
        .ProseMirror code {
          background: rgba(255,255,255,0.08);
          border-radius: 3px;
          padding: 0.15em 0.35em;
          font-size: 0.9em;
          font-family: ui-monospace, monospace;
        }

        /* Code block */
        .ProseMirror pre {
          background: #141433;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 6px;
          padding: 0.8em 1em;
          overflow-x: auto;
          margin: 0.6em 0;
        }
        .ProseMirror pre code {
          background: none;
          padding: 0;
          border-radius: 0;
          font-size: 0.85em;
          color: #BEBECE;
        }

        /* Links */
        .ProseMirror a {
          color: #2596FF;
          text-decoration: underline;
          text-underline-offset: 2px;
          cursor: pointer;
        }
        .ProseMirror a:hover { color: #25B1FF; }

        /* Images */
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 6px;
          margin: 0.5em 0;
        }

        /* Task list */
        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }
        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5em;
        }
        .ProseMirror ul[data-type="taskList"] li label input[type="checkbox"] {
          margin-top: 0.3em;
          accent-color: #2596FF;
        }

        /* Highlight */
        .ProseMirror mark {
          background-color: rgba(255,200,0,0.3);
          border-radius: 2px;
          padding: 0.05em 0.15em;
        }

        /* Text align */
        .ProseMirror .has-text-align-center { text-align: center; }
        .ProseMirror .has-text-align-right { text-align: right; }
        .ProseMirror [style*="text-align: center"] { text-align: center; }
        .ProseMirror [style*="text-align: right"] { text-align: right; }
      `}</style>

      {/* Link modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowLinkModal(false)}>
          <div className="w-full max-w-[400px] rounded-[8px] border border-[color:var(--bg-700)] bg-[color:var(--bg-900)] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-[14px] font-bold text-white">Inserer un lien</h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (linkUrl.trim()) {
                    editor?.chain().focus().extendMarkRange("link").setLink({ href: linkUrl.trim() }).run();
                  } else {
                    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
                  }
                  setShowLinkModal(false);
                }
              }}
              className="mb-3 h-[40px] w-full rounded-[4px] border border-[color:var(--bg-700)] bg-[color:var(--bg-800)] px-3 text-[13px] text-white placeholder:text-[color:var(--foreground)]/30 focus:border-[#2596FF] focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2">
              {editor?.isActive("link") && (
                <button
                  type="button"
                  onClick={() => { editor?.chain().focus().extendMarkRange("link").unsetLink().run(); setShowLinkModal(false); }}
                  className="rounded-[4px] border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-400 hover:bg-red-500/20"
                >
                  Supprimer le lien
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="rounded-[4px] bg-[color:var(--bg-700)] px-3 py-1.5 text-[11px] font-bold text-[color:var(--foreground)]/60 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (linkUrl.trim()) {
                    editor?.chain().focus().extendMarkRange("link").setLink({ href: linkUrl.trim() }).run();
                  }
                  setShowLinkModal(false);
                }}
                className="rounded-[4px] bg-[#2596FF] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#2976E8]"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
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
