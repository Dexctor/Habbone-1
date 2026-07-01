import { SitePage, SiteSkeleton, SiteSkeletonHeader, SiteSkeletonPanel } from "@/components/site"

export default function TeamLoading() {
  return (
    <SitePage className="gap-3">
      <SiteSkeletonHeader />
      {Array.from({ length: 3 }).map((_, section) => (
        <SiteSkeletonPanel key={section} className="px-5 py-6">
          <SiteSkeleton className="mb-4 h-5 w-[140px]" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:[grid-template-columns:repeat(2,minmax(0,278px))]">
            {Array.from({ length: 2 }).map((__, index) => (
              <div key={index} className="rounded-[8px] border-2 border-white/10 bg-black/10 px-3 pb-[10px] pt-3">
                <div className="flex items-start gap-2">
                  <SiteSkeleton className="h-[70px] w-[64px] shrink-0" />
                  <div className="flex-1 space-y-3">
                    <SiteSkeleton className="h-5 w-[120px]" />
                    <SiteSkeleton className="h-4 w-[180px]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SiteSkeletonPanel>
      ))}
    </SitePage>
  )
}
