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
    <section className="rounded-[4px] border border-[#1F1F3E] bg-[#272746]">
      <div className="border-b border-[#1F1F3E] px-5 py-4">
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="h-auto w-full justify-start gap-2 bg-transparent p-0">
            <TabsTrigger
              value="friends"
              className="rounded-[4px] border border-transparent bg-[rgba(255,255,255,0.1)] px-3 py-2 text-[12px] font-bold uppercase text-[#DDD] data-[state=active]:border-[#1F1F3E] data-[state=active]:bg-[#1F1F3E]"
            >
              Amis{f}
            </TabsTrigger>
            <TabsTrigger
              value="groups"
              className="rounded-[4px] border border-transparent bg-[rgba(255,255,255,0.1)] px-3 py-2 text-[12px] font-bold uppercase text-[#DDD] data-[state=active]:border-[#1F1F3E] data-[state=active]:bg-[#1F1F3E]"
            >
              Groupes{g}
            </TabsTrigger>
            <TabsTrigger
              value="badges"
              className="rounded-[4px] border border-transparent bg-[rgba(255,255,255,0.1)] px-3 py-2 text-[12px] font-bold uppercase text-[#DDD] data-[state=active]:border-[#1F1F3E] data-[state=active]:bg-[#1F1F3E]"
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
