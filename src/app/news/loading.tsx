import { SitePage, SiteSkeleton, SiteSkeletonHeader, SiteSkeletonPanel } from "@/components/site"

export default function NewsLoading() {
  return (
    <SitePage>
      <SiteSkeletonHeader actions />
      <div className="space-y-[10px]">
        {Array.from({ length: 5 }).map((_, index) => (
          <SiteSkeletonPanel key={index} className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:gap-6">
              <SiteSkeleton className="h-[150px] w-full md:w-[300px]" />
              <div className="flex flex-1 flex-col gap-4">
                <SiteSkeleton className="h-5 w-2/3" />
                <div className="space-y-2">
                  <SiteSkeleton className="h-4 w-full" />
                  <SiteSkeleton className="h-4 w-4/5" />
                  <SiteSkeleton className="h-4 w-2/3" />
                </div>
                <div className="flex gap-3">
                  <SiteSkeleton className="h-[42px] w-[120px]" />
                  <SiteSkeleton className="h-[42px] w-[110px]" />
                </div>
              </div>
            </div>
          </SiteSkeletonPanel>
        ))}
      </div>
    </SitePage>
  )
}
