import { SitePage, SiteSkeleton, SiteSkeletonHeader, SiteSkeletonPanel } from "@/components/site"

export default function PostLoading() {
  return (
    <SitePage width="md">
      <SiteSkeletonPanel className="p-5">
        <SiteSkeletonHeader />
        <div className="mt-5 space-y-2">
          <SiteSkeleton className="h-4 w-full" />
          <SiteSkeleton className="h-4 w-3/4" />
          <SiteSkeleton className="h-4 w-1/2" />
        </div>
      </SiteSkeletonPanel>
    </SitePage>
  )
}
