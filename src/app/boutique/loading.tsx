import { SitePage, SiteSkeleton, SiteSkeletonHeader, SiteSkeletonPanel } from "@/components/site"

export default function BoutiqueLoading() {
  return (
    <SitePage width="lg" className="gap-8 lg:px-8">
      <SiteSkeletonHeader actions />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SiteSkeletonPanel key={index} className="overflow-hidden p-0">
            <SiteSkeleton className="h-[140px] rounded-none bg-[#303060]/70" />
            <div className="space-y-3 p-5">
              <SiteSkeleton className="h-4 w-3/4" />
              <SiteSkeleton className="h-8 w-24" />
              <SiteSkeleton className="h-10 w-full" />
            </div>
          </SiteSkeletonPanel>
        ))}
      </div>
    </SitePage>
  )
}
