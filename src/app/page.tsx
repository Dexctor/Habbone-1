
import LatestArticles from "@/components/home/latest-articles";
import Stories from "@/components/home/stories";
import ForumTopics from "@/components/home/forum-topics";
import LatestBadges from "@/components/home/latest-mobis";
import Publicite from "@/components/home/publicite";
import Ranking from "@/components/home/ranking";
import SectionReveal from "@/components/motion/section-reveal";
import { SitePage } from "@/components/site";

export const revalidate = 300;

export default function Home() {
  return (
    <SitePage className="gap-[70px]">
      <SectionReveal>
        <Stories />
      </SectionReveal>

      <SectionReveal delay={0.06}>
        <LatestArticles />
      </SectionReveal>

      <SectionReveal>
        <ForumTopics />
      </SectionReveal>

      <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <SectionReveal>
          <LatestBadges />
        </SectionReveal>
        <SectionReveal delay={0.06}>
          <Publicite />
        </SectionReveal>
      </section>

      <SectionReveal>
        <Ranking />
      </SectionReveal>
    </SitePage>
  );
}
