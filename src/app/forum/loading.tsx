import { SitePage, SiteSkeleton, SiteSkeletonHeader, SiteSkeletonPanel } from "@/components/site"

export default function ForumLoading() {
  return (
    <SitePage className="gap-8 sm:px-8">
      <div className="flex justify-end gap-3">
        <SiteSkeleton className="h-[50px] w-[150px]" />
        <SiteSkeleton className="h-[50px] w-[390px]" />
      </div>
      {Array.from({ length: 3 }).map((_, section) => (
        <div key={section} className="space-y-2">
          <SiteSkeletonHeader />
          <SiteSkeletonPanel className="space-y-3 p-0">
            {Array.from({ length: 3 }).map((__, row) => (
              <div key={row} className="flex items-center gap-3 border-b border-[#34345A] px-5 py-5 last:border-b-0">
                <div className="flex-1 space-y-2">
                  <SiteSkeleton className="h-5 w-[55%]" />
                  <SiteSkeleton className="h-4 w-[75%]" />
                </div>
                <SiteSkeleton className="h-[38px] w-[90px]" />
                <SiteSkeleton className="h-[38px] w-[90px]" />
              </div>
            ))}
          </SiteSkeletonPanel>
        </div>
      ))}
    </SitePage>
  )
}
