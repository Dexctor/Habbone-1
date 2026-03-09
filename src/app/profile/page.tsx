import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/auth'
import ProfileClient from '@/components/profile/ProfileClient'

export const revalidate = 0

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login?from=/profile')
  }

  const user = session.user as any
  const nick = user?.nick ?? 'Utilisateur'

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-10 sm:px-6">
      <section className="flex h-[76px] items-center justify-between rounded-[4px] border border-black/60 bg-[#1F1F3E] px-5 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/profile.png" alt="" className="h-[41px] w-auto image-pixelated" />
          <h1 className="text-[18px] font-bold uppercase text-[#DDD] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            Mon Profil
          </h1>
        </div>

        <div className="relative hidden w-[255px] sm:block">
          <span className="material-icons pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[#BEBECE]">
            search
          </span>
          <input
            type="search"
            placeholder="Rechercher un autre utilisateur"
            className="h-[50px] w-full rounded-[4px] border border-transparent bg-[rgba(255,255,255,0.1)] pl-10 pr-3 text-[12px] text-[#DDD] placeholder:text-[#BEBECE]/80 focus-visible:border-[#2596FF] focus-visible:outline-none"
          />
        </div>
      </section>

      <ProfileClient nick={nick} />
    </main>
  )
}
