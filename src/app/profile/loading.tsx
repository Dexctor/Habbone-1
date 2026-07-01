import { SitePage, SiteSkeleton, SiteSkeletonHeader, SiteSkeletonPanel } from "@/components/site"

export default function ProfileLoading() {
  return (
    <SitePage>
      <SiteSkeletonHeader actions />
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[350px_minmax(0,818px)]">
        <aside className="space-y-4">
          <SiteSkeletonPanel className="h-[220px]" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SiteSkeleton key={index} className="h-[41px] w-full" />
            ))}
          </div>
        </aside>
        <div className="space-y-6">
          <SiteSkeletonPanel className="h-[210px]" />
          <SiteSkeletonPanel className="h-[240px]" />
          <SiteSkeletonPanel className="h-[300px]" />
        </div>
      </div>
    </SitePage>
  )
}
