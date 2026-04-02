"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import RichEditor from "@/components/editor/RichEditor";
import { stripHtml } from "@/lib/text-utils";

export default function ForumCommentForm({ topicId }: { topicId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onToggle = () => setOpen((value) => !value);
    const onOpen = () => setOpen(true);
    window.addEventListener("toggle-comment-form", onToggle as any);
    window.addEventListener("open-comment-form", onOpen as any);
    if (typeof window !== "undefined" && window.location.hash === "#post-comment") setOpen(true);
    return () => {
      window.removeEventListener("toggle-comment-form", onToggle as any);
      window.removeEventListener("open-comment-form", onOpen as any);
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const html = String(formData.get("commentaire") || "");
    const plain = stripHtml(html, { replaceNbsp: true });
    if (!plain) {
      toast.error("Commentaire vide");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/forum/topic/${topicId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: html }),
      });
      const payload = await response.json().catch(() => ({} as any));
      if (!response.ok) {
        toast.error(payload?.error || "Echec de publication");
        return;
      }

      toast.success("Commentaire publie");
      setEditorKey((key) => key + 1);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Erreur reseau");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      id="post-comment"
      onSubmit={handleSubmit}
      className={`rounded-[4px] border border-[#141433] bg-[#272746] p-4 transition-all ${open ? "block" : "hidden"}`}
    >
      <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.04em] text-[#DDD]">
        Votre commentaire
      </label>
      <div className="rounded-[4px] border border-[#141433] bg-[#1F1F3E]">
        <RichEditor
          key={editorKey}
          name="commentaire"
          variant="comment"
          placeholder="Ecrire votre reponse..."
        />
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-[38px] items-center justify-center rounded-[4px] bg-[#2596FF] px-4 text-[12px] font-bold uppercase tracking-[0.04em] text-white hover:bg-[#2976E8] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Publication..." : "Publier"}
        </button>
      </div>
    </form>
  );
}
