"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileSearchBar({ currentNick }: { currentNick: string }) {
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
        className="h-[50px] w-full rounded-[4px] border border-transparent bg-[rgba(255,255,255,0.1)] pl-10 pr-3 text-[12px] text-[#DDD] placeholder:text-[#BEBECE]/80 focus-visible:border-[#2596FF] focus-visible:outline-none"
      />
    </form>
  );
}
