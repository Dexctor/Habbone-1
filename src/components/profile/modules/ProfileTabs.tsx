"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function ProfileTabs({
  friendsSlot,
  groupsSlot,
  badgesSlot,
  counts,
}: {
  friendsSlot?: React.ReactNode;
  groupsSlot?: React.ReactNode;
  badgesSlot?: React.ReactNode;
  counts?: { friends?: number; groups?: number; badges?: number };
}) {
  const f = typeof counts?.friends === "number" ? ` (${counts.friends})` : "";
  const g = typeof counts?.groups === "number" ? ` (${counts.groups})` : "";
  const b = typeof counts?.badges === "number" ? ` (${counts.badges})` : "";

  return (
    <section className="overflow-hidden rounded-[6px] border border-[#141433] bg-[#272746] shadow-[0_18px_45px_-34px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="px-5 py-4">
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="h-auto w-full justify-start gap-2 rounded-[6px] border border-[#141433] bg-[#1F1F3E]/60 p-1">
            <TabsTrigger
              value="friends"
              className="rounded-[5px] border border-transparent bg-transparent px-3 py-2 text-[12px] font-extrabold uppercase text-[#BEBECE] transition hover:bg-[#303060]/60 hover:text-white data-[state=active]:border-[#2596FF]/30 data-[state=active]:bg-[#2596FF] data-[state=active]:text-white"
            >
              Amis{f}
            </TabsTrigger>
            <TabsTrigger
              value="groups"
              className="rounded-[5px] border border-transparent bg-transparent px-3 py-2 text-[12px] font-extrabold uppercase text-[#BEBECE] transition hover:bg-[#303060]/60 hover:text-white data-[state=active]:border-[#2596FF]/30 data-[state=active]:bg-[#2596FF] data-[state=active]:text-white"
            >
              Groupes{g}
            </TabsTrigger>
            <TabsTrigger
              value="badges"
              className="rounded-[5px] border border-transparent bg-transparent px-3 py-2 text-[12px] font-extrabold uppercase text-[#BEBECE] transition hover:bg-[#303060]/60 hover:text-white data-[state=active]:border-[#2596FF]/30 data-[state=active]:bg-[#2596FF] data-[state=active]:text-white"
            >
              Badges{b}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4 px-0 pb-0">
            {friendsSlot}
          </TabsContent>
          <TabsContent value="groups" className="mt-4 px-0 pb-0">
            {groupsSlot}
          </TabsContent>
          <TabsContent value="badges" className="mt-4 px-0 pb-0">
            {badgesSlot}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
