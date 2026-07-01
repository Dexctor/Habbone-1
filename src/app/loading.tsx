import { SitePage, SiteSkeleton, SiteSkeletonHeader, SiteSkeletonPanel } from "@/components/site"

export default function HomeLoading() {
  return (
    <SitePage className="gap-[70px]">
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <SiteSkeleton key={index} className="h-[80px] w-[80px] shrink-0 rounded-full" />
        ))}
      </div>

      <section>
        <div className="mb-[30px] flex items-center justify-between gap-4">
          <SiteSkeleton className="h-6 w-[220px]" />
          <div className="hidden gap-2 sm:flex">
            <SiteSkeleton className="h-[50px] w-[255px]" />
            <SiteSkeleton className="h-[50px] w-[50px]" />
            <SiteSkeleton className="h-[50px] w-[50px]" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-[30px] md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SiteSkeletonPanel key={index} className="h-[237px]" />
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <SiteSkeletonHeader actions />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SiteSkeletonPanel key={index} className="h-[122px]" />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <SiteSkeletonPanel className="h-[500px]" />
        <SiteSkeletonPanel className="h-[350px]" />
      </section>

      <section className="space-y-5">
        <SiteSkeletonHeader actions />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
          <SiteSkeletonPanel className="h-[320px]" />
          <SiteSkeletonPanel className="h-[320px]" />
        </div>
      </section>
    </SitePage>
  )
}
