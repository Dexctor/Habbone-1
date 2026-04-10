'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function AuthMenu() {
  const { data: session, status } = useSession();
  const loading = status === 'loading';

  if (loading) return null;

  if (!session?.user) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/login" className="underline">Se connecter</Link>
        <Link href="/register" className="underline">Créer un compte</Link>
        <Link href="/forum" className="underline">forum</Link>
        <Link href="/news" className="underline">Articles</Link>

      </div>
    );
  }

  const nick = (session.user as any).nick ?? 'Utilisateur';

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm opacity-80">Bonjour, {nick}</span>
      <Link href="/profile" className="rounded px-3 py-1 border hover:bg-white hover:text-black">Mon profil</Link>
      <Link href="/forum" className="underline">forum</Link>
      <Link href="/news" className="underline">Articles</Link>
      <Link href="/admin" className="underline">Admin</Link>
      <Link href="/" className="underline">Accueil</Link>
      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className="rounded px-3 py-1 border hover:bg-white hover:text-black"
      >
        Déconnexion
      </button>
    </div>
  );
}
