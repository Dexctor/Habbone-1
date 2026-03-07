

import LatestArticles from "@/components/home/latest-articles";
import Stories from "@/components/home/stories";
import ForumTopics from "@/components/home/forum-topics";
import LatestMobis from "@/components/home/latest-mobis";

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto w-full px-4 py-6 md:px-6 lg:px-8 space-y-12">
      <Stories />
      <LatestArticles />
      <ForumTopics />
      <LatestMobis />
    </main>
  );
}

