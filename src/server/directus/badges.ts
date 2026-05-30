import 'server-only';

/**
 * Compatibility re-export: this façade now delegates entirely to the Supabase
 * implementation. The role-badge mapping constants are kept here because the
 * Supabase implementation imports them via this module's type re-export.
 */

export {
  getUserBadges,
  getRoleBadgesForNicks,
  ensureRoleBadge,
} from '@/server/supabase/badges';

export const ROLE_BADGE_IMAGE: Record<string, string> = {
  'fondateur': '/badges-roles/HOFONDA.gif',
  'responsable': '/badges-roles/HORESP.gif',
  'animateurs': '/badges-roles/HOANIM.gif',
  'journaliste': '/badges-roles/HOJOURNA.gif',
  'correcteur': '/badges-roles/HOCORRE.gif',
  'configurateur wired': '/badges-roles/HOWIRED.gif',
  'constructeur': '/badges-roles/HOCONST.gif',
  'graphiste': '/badges-roles/HOGRAPH.gif',
  'member': '/badges-roles/HOUSER.gif',
};

export type UserBadge = {
  id: number;
  nome: string;
  imagem: string;
};

export function getRoleBadgeImage(roleName: string): string | null {
  return ROLE_BADGE_IMAGE[roleName.toLowerCase().trim()] ?? null;
}
