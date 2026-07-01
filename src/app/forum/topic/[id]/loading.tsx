import { SitePage, SiteSkeleton, SiteSkeletonHeader, SiteSkeletonPanel } from "@/components/site"

export default function TopicLoading() {
  return (
    <SitePage className="gap-8 sm:px-8">
      <SiteSkeletonPanel className="overflow-hidden p-0">
        <SiteSkeletonHeader />
        <div className="space-y-4 p-5">
          <SiteSkeleton className="mx-auto h-[180px] w-full max-w-[760px]" />
          <SiteSkeleton className="h-4 w-full" />
          <SiteSkeleton className="h-4 w-[90%]" />
          <SiteSkeleton className="h-4 w-[82%]" />
        </div>
        <div className="border-t border-[#141433] px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SiteSkeleton className="h-[62px] w-[54px]" />
              <SiteSkeleton className="h-5 w-[120px]" />
            </div>
            <div className="flex gap-2">
              <SiteSkeleton className="h-[38px] w-[70px]" />
              <SiteSkeleton className="h-[38px] w-[70px]" />
            </div>
          </div>
        </div>
      </SiteSkeletonPanel>

      <section className="space-y-4">
        <SiteSkeletonHeader actions />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-start gap-3">
            <SiteSkeleton className="h-[58px] w-[58px] shrink-0 rounded-full" />
            <SiteSkeletonPanel className="h-[90px] flex-1" />
          </div>
        ))}
      </section>
    </SitePage>
  )
}
