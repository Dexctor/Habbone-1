"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileSearchBar({ currentNick: _currentNick }: { currentNick: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nick = query.trim();
    if (!nick) return;
    router.push(`/profile?user=${encodeURIComponent(nick)}`);
    setQuery("");
  };

  return (
    <form onSubmit={handleSubmit} className="relative hidden w-[255px] sm:block">
      <span className="material-icons pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[#BEBECE]">
        search
      </span>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un pseudo Habbo"
        className="h-[50px] w-full rounded-[6px] border border-white/5 bg-[#303060]/70 pl-10 pr-3 text-[12px] font-medium text-[#DDD] placeholder:text-[#BEBECE]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-visible:border-[#2596FF]/80 focus-visible:bg-[#303060] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2596FF]/15"
      />
    </form>
  );
}
