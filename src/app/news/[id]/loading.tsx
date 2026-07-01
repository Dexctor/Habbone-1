import { SitePage, SiteSkeleton, SiteSkeletonHeader, SiteSkeletonPanel } from "@/components/site"

export default function NewsArticleLoading() {
  return (
    <SitePage className="gap-10">
      <SiteSkeletonPanel className="overflow-hidden p-0">
        <SiteSkeletonHeader />
        <div className="flex flex-col items-center gap-4 px-6 py-8">
          <SiteSkeleton className="h-[260px] w-full max-w-[760px]" />
          <div className="w-full space-y-2">
            <SiteSkeleton className="h-4 w-full" />
            <SiteSkeleton className="h-4 w-[92%]" />
            <SiteSkeleton className="h-4 w-[86%]" />
            <SiteSkeleton className="h-4 w-[78%]" />
            <SiteSkeleton className="h-4 w-[88%]" />
          </div>
        </div>
        <div className="border-t border-[#141433] px-4 py-4">
          <div className="flex items-center gap-4">
            <SiteSkeleton className="h-[50px] w-[50px]" />
            <SiteSkeleton className="h-5 w-[120px]" />
            <SiteSkeleton className="h-4 w-[100px]" />
          </div>
        </div>
      </SiteSkeletonPanel>

      <section className="space-y-4">
        <SiteSkeletonHeader actions />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-start gap-3">
            <SiteSkeleton className="h-[58px] w-[58px] shrink-0 rounded-full" />
            <SiteSkeletonPanel className="h-[100px] flex-1" />
          </div>
        ))}
      </section>
    </SitePage>
  )
}
