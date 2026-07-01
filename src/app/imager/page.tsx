import ImagerClient from '@/components/imager/ImagerClient'
import { SitePage } from '@/components/site'

export const revalidate = 3600

export default function ImagerPage() {
  return (
    <SitePage>
      <ImagerClient />
    </SitePage>
  )
}
