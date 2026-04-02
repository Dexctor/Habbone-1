
import LatestArticles from "@/components/home/latest-articles";
import Stories from "@/components/home/stories";
import ForumTopics from "@/components/home/forum-topics";
import LatestBadges from "@/components/home/latest-mobis";
import Publicite from "@/components/home/publicite";
import Ranking from "@/components/home/ranking";

export const revalidate = 60;

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-[70px] px-4 py-10 sm:px-6">
      <Stories />
      <LatestArticles />
      <ForumTopics />

      <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <LatestBadges />
        <Publicite />
      </section>

      <Ranking />
    </main>
  );
}
