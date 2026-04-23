// src/auth.ts
import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import {
  listUsersByNick,
  normalizeHotelCode,
  passwordsMatch,
  upgradePasswordToBcrypt,
  isBcrypt,
  asTrue,
  asFalse,
  tryUpdateHabboSnapshotForUser,
} from '@/server/directus/users';
import { getRoleById } from '@/server/directus/roles';
import { getHabboUserByNameForHotel } from '@/server/habbo-cache';
import { ensureRoleBadge } from '@/server/directus/badges';
import { syncHabboName } from '@/server/directus/pseudo-changes';

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
        const nick = (creds?.nick as string | undefined || '').trim();
        const password = (creds?.password as string | undefined) || '';
        if (!nick || !password) return null;

        const candidates = await listUsersByNick(nick);
        if (!candidates.length) return null;

        let user: any = null;
        for (const candidate of candidates) {
          if (passwordsMatch(password, candidate.senha)) {
            user = candidate;
            break;
          }
        }

        if (!user) return null;

        const hotelCode = normalizeHotelCode((user as any)?.habbo_hotel);

        if (asTrue(user.banido)) throw new Error('Compte banni.');
        if (asFalse(user.ativado)) throw new Error('Compte non activé.');

        if (!isBcrypt(user.senha)) {
          try {
            await upgradePasswordToBcrypt(Number(user.id), password);
          } catch {}
        }

        try {
          const core = await getHabboUserByNameForHotel(user.nick, hotelCode, { cache: false });
          void tryUpdateHabboSnapshotForUser(Number(user.id), core);

          // Detect pseudo change : compare Habbo API nick with stored one
          const apiUniqueId = (core as any)?.uniqueId;
          const apiNick = (core as any)?.name;
          const storedNick = (user as any)?.habbo_name || user.nick;
          if (apiUniqueId && apiNick) {
            void syncHabboName(String(apiUniqueId), String(apiNick), {
              hotel: hotelCode,
              userId: Number(user.id),
              previousNick: storedNick ? String(storedNick) : undefined,
            });
          }
        } catch {}

        // ── Unified role system: read directus_role_id from usuarios ──
        const directusRoleId: string | null = (user as any).directus_role_id || null;
        let directusRoleName: string | null = null;
        let directusAdminAccess = false;

        if (directusRoleId) {
          try {
            const roleRow = await getRoleById(directusRoleId);
            if (roleRow) {
              directusRoleName = roleRow.name ?? null;
              directusAdminAccess = roleRow.admin_access === true;
            }
          } catch {}
        }

        // Fallback: ADMIN_NICKS env var for bootstrapping.
        // This is ONLY honoured until ADMIN_NICKS_UNTIL (unix timestamp, seconds).
        // Rationale: once a real admin exists in Directus, the nick-based fallback
        // should stop being a trust anchor — otherwise anyone who grabs the nick
        // regains admin after rotation.
        const adminNicksUntilRaw = process.env.ADMIN_NICKS_UNTIL || '';
        const adminNicksUntil = Number.parseInt(adminNicksUntilRaw, 10);
        const nicksFallbackActive =
          Number.isFinite(adminNicksUntil) && adminNicksUntil * 1000 > Date.now();

        const adminNicks = nicksFallbackActive
          ? (process.env.ADMIN_NICKS || '')
              .split(',')
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean)
          : [];
        const isAdminByNick = adminNicks.includes(String(user.nick || '').toLowerCase());

        const computedAdminAccess = directusAdminAccess || isAdminByNick;
        const role = computedAdminAccess ? 'admin' : 'member';

        // Auto-assign role badge on login (non-blocking)
        void ensureRoleBadge(Number(user.id), directusRoleName || role);

        return {
          id: String(user.id),
          nick: user.nick,
          email: user.email || null,
          avatar: user.avatar || null,
          missao: user.missao || null,
          hotel: hotelCode,
          role,
          directusRoleId,
          directusRoleName,
          directusAdminAccess: computedAdminAccess,
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
        token.directusRoleId = user.directusRoleId ?? null;
        token.directusRoleName = user.directusRoleName ?? null;
        token.directusAdminAccess = user.directusAdminAccess === true;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.uid,
        nick: token.nick,
        avatar: token.avatar,
        missao: token.missao,
        hotel: token.hotel ?? 'fr',
        role: token.role,
        email: token.email,
        directusRoleId: token.directusRoleId ?? null,
        directusRoleName: token.directusRoleName ?? null,
        directusAdminAccess: token.directusAdminAccess === true,
      };
      return session;
    },
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
};
