import type { DefaultSession, DefaultUser } from 'next-auth';
import type { DefaultJWT } from 'next-auth/jwt';

export type AppRole = 'admin' | 'member';

declare module 'next-auth' {
  interface User extends DefaultUser {
    nick: string;
    avatar: string | null;
    missao: string | null;
    hotel: string;
    role: AppRole;
    directusRoleId: string | null;
    directusRoleName: string | null;
    directusAdminAccess: boolean;
  }

  interface Session {
    user: {
      id: string;
      nick: string;
      avatar: string | null;
      missao: string | null;
      hotel: string;
      role: AppRole;
      email: string | null;
      directusRoleId: string | null;
      directusRoleName: string | null;
      directusAdminAccess: boolean;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    uid: string;
    nick: string;
    avatar: string | null;
    missao: string | null;
    hotel: string;
    role: AppRole;
    email: string | null;
    directusRoleId: string | null;
    directusRoleName: string | null;
    directusAdminAccess: boolean;
  }
}
