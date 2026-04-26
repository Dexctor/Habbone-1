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
    Heading1,
    Heading2,
    Heading3,
    Heading4,
    Heading5,
    Heading6,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const low = createLowlight(common);

// Couleurs alignées sur globals.css → .article-content h1..h6
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

interface AdminRichEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
}

export default function AdminRichEditor({
    value,
    onChange,
    placeholder = "Écrivez ici...",
}: AdminRichEditorProps) {
    const extensions = [
        StarterKit.configure({ codeBlock: false }),
        Placeholder.configure({ placeholder }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Underline,
        Link.configure({ openOnClick: true, autolink: true, linkOnPaste: true }),
        Highlight.configure({ multicolor: true }),
        TextStyle,
        Color,
        Image.configure({ allowBase64: true }),
        CodeBlockLowlight.configure({ lowlight: low }),
    ];

    const editor = useEditor({
        extensions,
        content: value || "",
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                // article-content fait que les <h1>..<h6> tapés dans l'éditeur
                // affichent immédiatement les bandeaux colorés (vert/orange/etc.),
                // comme sur la page publique. C'est WYSIWYG pour l'admin.
                class:
                    "article-content prose prose-invert max-w-none min-h-[200px] rounded-md border border-[color:var(--bg-800)] bg-[color:var(--bg-600)] p-3 focus:outline-none",
            },
        },
    });

    // Update editor content when value prop changes (initial load)
    useEffect(() => {
        if (editor && value && editor.getHTML() !== value) {
            editor.commands.setContent(value);
        }
    }, [editor, value]);

    const toggle = (cmd: () => void) => (e: React.MouseEvent) => {
        e.preventDefault();
        cmd();
    };

    if (!editor) return <div className="h-32 bg-[color:var(--bg-700)] rounded animate-pulse" />;

    return (
        <div className="space-y-2">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 text-xs rounded-md border border-[color:var(--bg-800)] bg-[color:var(--bg-700)] p-2">
                {/* ── Titres colorés (h1..h6) ─────────────────────────── */}
                {/* Chaque bouton applique le niveau correspondant. Le CSS
                    .article-content (globals.css) leur donne automatiquement
                    le bandeau coloré (vert / jaune / bleu / rouge / violet / noir). */}
                {HEADING_BUTTONS.map(({ level, color, label, Icon }) => (
                    <ToolbarButton
                        key={level}
                        active={editor.isActive("heading", { level })}
                        label={label}
                        onClick={toggle(() => editor.chain().focus().toggleHeading({ level }).run())}
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
                <div className="w-px h-4 bg-[color:var(--bg-600)]" />
                <ToolbarButton active={editor.isActive("bold")} label="Gras" onClick={toggle(() => editor.chain().focus().toggleBold().run())}>
                    <Bold className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton active={editor.isActive("italic")} label="Italique" onClick={toggle(() => editor.chain().focus().toggleItalic().run())}>
                    <Italic className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton active={editor.isActive("strike")} label="Barré" onClick={toggle(() => editor.chain().focus().toggleStrike().run())}>
                    <Strikethrough className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton active={editor.isActive("underline")} label="Souligné" onClick={toggle(() => editor.chain().focus().toggleUnderline().run())}>
                    <UnderlineIcon className="h-3.5 w-3.5" />
                </ToolbarButton>
                <div className="w-px h-4 bg-[color:var(--bg-600)]" />
                <ToolbarButton active={editor.isActive("highlight")} label="Surlignage" onClick={toggle(() => editor.chain().focus().toggleHighlight().run())}>
                    <Highlighter className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton label="Règle" onClick={toggle(() => editor.chain().focus().setHorizontalRule().run())}>
                    <Minus className="h-3.5 w-3.5" />
                </ToolbarButton>
                <div className="w-px h-4 bg-[color:var(--bg-600)]" />
                <ToolbarButton active={editor.isActive("bulletList")} label="Liste" onClick={toggle(() => editor.chain().focus().toggleBulletList().run())}>
                    <List className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton active={editor.isActive("orderedList")} label="Liste numérotée" onClick={toggle(() => editor.chain().focus().toggleOrderedList().run())}>
                    <ListOrdered className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton active={editor.isActive("blockquote")} label="Citation" onClick={toggle(() => editor.chain().focus().toggleBlockquote().run())}>
                    <Quote className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton active={editor.isActive("codeBlock")} label="Bloc code" onClick={toggle(() => editor.chain().focus().toggleCodeBlock().run())}>
                    <CodeIcon className="h-3.5 w-3.5" />
                </ToolbarButton>
                <div className="w-px h-4 bg-[color:var(--bg-600)]" />
                <ToolbarButton label="Image" onClick={(e) => { e.preventDefault(); const url = prompt("URL de l'image"); if (url) editor.chain().focus().setImage({ src: url }).run(); }}>
                    <ImageIcon className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton active={editor.isActive("link")} label="Lien" onClick={(e) => { e.preventDefault(); const url = prompt("URL du lien"); if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run(); }}>
                    <LinkIcon className="h-3.5 w-3.5" />
                </ToolbarButton>
                <div className="w-px h-4 bg-[color:var(--bg-600)]" />
                <ToolbarButton active={editor.isActive({ textAlign: "left" })} label="Gauche" onClick={toggle(() => editor.chain().focus().setTextAlign("left").run())}>
                    <AlignLeft className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton active={editor.isActive({ textAlign: "center" })} label="Centrer" onClick={toggle(() => editor.chain().focus().setTextAlign("center").run())}>
                    <AlignCenter className="h-3.5 w-3.5" />
                </ToolbarButton>
                <ToolbarButton active={editor.isActive({ textAlign: "right" })} label="Droite" onClick={toggle(() => editor.chain().focus().setTextAlign("right").run())}>
                    <AlignRight className="h-3.5 w-3.5" />
                </ToolbarButton>
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
    onClick: (e: React.MouseEvent) => void;
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
