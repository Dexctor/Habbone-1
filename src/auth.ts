// src/auth.ts
import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import {
  verifyLogin,
  normalizeHotelCode,
  asTrue,
  asFalse,
  tryUpdateHabboSnapshotForUser,
} from '@/server/pocketbase/users';
import { getRoleById } from '@/server/pocketbase/roles';
import { getHabboUserByNameForHotel } from '@/server/habbo-cache';
import { ensureRoleBadge } from '@/server/pocketbase/badges';
import { syncHabboName } from '@/server/pocketbase/pseudo-changes';
import { checkRateLimitByKey } from '@/server/rate-limit';

// Validate the signing secret at RUNTIME (not at module load — that would fire
// during `next build`, which doesn't have runtime secrets). Called from
// authorize() on the first real login attempt.
function assertAuthSecret(): void {
  const secret = process.env.NEXTAUTH_SECRET;
  if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 16)) {
    throw new Error('NEXTAUTH_SECRET manquant ou trop court (>= 16 caractères requis en production)');
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        nick: { label: 'Pseudo Habbo', type: 'text' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      authorize: async (creds) => {
        assertAuthSecret();
        const nick = (creds?.nick as string | undefined || '').trim();
        const password = (creds?.password as string | undefined) || '';
        if (!nick || !password) return null;

        // Brute-force protection. authorize() gets no Request (so no client IP),
        // so we throttle per-account by normalised nick. 10 attempts / 10 min.
        const rl = checkRateLimitByKey(`login:${nick.toLowerCase()}`, { limit: 10, windowMs: 10 * 60 * 1000 });
        if (!rl.ok) {
          throw new Error('Trop de tentatives. Réessayez plus tard.');
        }

        // Native PocketBase auth: validates nick+password (bcrypt) in one call.
        // PB matches the identity case-insensitively; works for both app-created
        // users and legacy users imported via SQL.
        const user: any = await verifyLogin(nick, password);
        if (!user) return null;

        const hotelCode = normalizeHotelCode((user as any)?.habbo_hotel);

        if (asTrue(user.banido)) throw new Error('Compte banni.');
        if (asFalse(user.ativado)) throw new Error('Compte non activé.');

        try {
          const core = await getHabboUserByNameForHotel(user.nick, hotelCode, { cache: false });
          void tryUpdateHabboSnapshotForUser(String(user.id), core);

          // Detect pseudo change : compare Habbo API nick with stored one
          const apiUniqueId = (core as any)?.uniqueId;
          const apiNick = (core as any)?.name;
          const storedNick = (user as any)?.habbo_name || user.nick;
          if (apiUniqueId && apiNick) {
            void syncHabboName(String(apiUniqueId), String(apiNick), {
              hotel: hotelCode,
              userId: String(user.id),
              previousNick: storedNick ? String(storedNick) : undefined,
            });
          }
        } catch {}

        const roleId: string | null = (user as any).role_id || null;
        let roleName: string | null = null;
        let adminAccess = false;

        if (roleId) {
          try {
            const roleRow = await getRoleById(roleId);
            if (roleRow) {
              roleName = roleRow.name ?? null;
              adminAccess = roleRow.admin_access === true;
            }
          } catch {}
        }

        const role = adminAccess ? 'admin' : 'member';

        // Auto-assign role badge on login (non-blocking)
        void ensureRoleBadge(String(user.id), roleName || role);

        return {
          id: String(user.id),
          nick: user.nick,
          email: user.email || null,
          avatar: user.avatar || null,
          missao: user.missao || null,
          hotel: hotelCode,
          role,
          roleId,
          roleName,
          adminAccess,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.nick = user.nick;
        token.avatar = user.avatar;
        token.missao = user.missao;
        token.hotel = user.hotel ?? 'fr';
        token.role = user.role ?? 'member';
        token.email = user.email ?? null;
        token.roleId = user.roleId ?? null;
        token.roleName = user.roleName ?? null;
        token.adminAccess = user.adminAccess === true;
      }
      return token;
    },
    async session({ session, token }) {
      const roleId = token.roleId ?? null;
      const roleName = token.roleName ?? null;
      const adminAccess = token.adminAccess === true;
      session.user = {
        id: token.uid,
        nick: token.nick,
        avatar: token.avatar,
        missao: token.missao,
        hotel: token.hotel ?? 'fr',
        role: token.role,
        email: token.email,
        roleId,
        roleName,
        adminAccess,
      };
      return session;
    },
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
};
