"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import RichEditor from "@/components/editor/RichEditor";
import { Button } from "@/components/ui/button";
import { stripHtml } from "@/lib/text-utils";

export default function NewsCommentForm({ newsId }: { newsId: number }) {
  const router = useRouter();
  const [editorKey, setEditorKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const html = String(formData.get("comentario") || "");
    const plain = stripHtml(html, { replaceNbsp: true });
    if (!plain) {
      toast.error("Commentaire vide");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/news/${newsId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: html }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error || "Echec de publication");
        return;
      }
      toast.success("Commentaire publie");
      setEditorKey((key) => key + 1);
      router.refresh();
    } catch {
      toast.error("Erreur reseau");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      id="post-comment"
      className="space-y-4 rounded-md border border-[color:var(--bg-600)]/55 bg-[color:var(--bg-800)]/45 p-5 shadow-[0_18px_55px_-45px_rgba(0,0,0,0.6)]"
    >
      <div className="text-sm font-semibold text-[color:var(--foreground)]/85">
        Ajouter un commentaire
      </div>
      <div className="rounded-md border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-900)]/50 p-2">
        <RichEditor
          key={editorKey}
          name="comentario"
          variant="comment"
          placeholder="Partage ton avis sur cet article..."
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center rounded-sm bg-[#1d4bff] px-5 text-sm font-semibold text-white transition hover:bg-[#335bff] disabled:cursor-not-allowed disabled:opacity-75"
        >
          {submitting ? "Publication..." : "Publier"}
        </Button>
      </div>
    </form>
  );
}
