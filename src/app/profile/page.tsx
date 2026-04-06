import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/auth'
import ProfileClient from '@/components/profile/ProfileClient'
import ProfileSearchBar from '@/components/profile/ProfileSearchBar'

export const revalidate = 0

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login?from=/profile')
  }

  const params = await searchParams
  const currentUser = (session.user as any)?.nick ?? 'Utilisateur'
  const viewingNick = params?.user || currentUser

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-10 sm:px-6">
      <section className="flex h-[76px] items-center justify-between rounded-[4px] border border-black/60 bg-[#1F1F3E] px-5 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/profile.png" alt="" className="h-[41px] w-auto image-pixelated" />
          <h1 className="text-[18px] font-bold uppercase text-[#DDD] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            {viewingNick === currentUser ? 'Mon Profil' : `Profil de ${viewingNick}`}
          </h1>
        </div>

        <ProfileSearchBar currentNick={viewingNick} />
      </section>

      <ProfileClient nick={viewingNick} />
    </main>
  )
}
