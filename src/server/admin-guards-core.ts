/**
 * Pure decision logic for admin guard checks — no Next.js, no Directus I/O.
 *
 * `admin-guards.ts` wires these rules to real fetch() calls against Directus.
 * We keep them in a separate module so the business rules (self-action,
 * admin-target, founder-only) can be unit-tested in plain Node.
 */

export type GuardDecision =
  | { ok: true }
  | { ok: false; code: GuardDenyCode; status: number; error: string };

export type GuardDenyCode =
  | 'SELF_ACTION_FORBIDDEN'
  | 'TARGET_NOT_FOUND'
  | 'ADMIN_TARGET_FORBIDDEN';

export type GuardInputs = {
  callerId: string | null;
  callerIsFounder: boolean;
  targetUserId: string;
  target: { id: string; isAdmin: boolean } | null;
};

export function cleanUserId(id: string): string {
  return id.startsWith('legacy:') ? id.split(':')[1] : id;
}

export function decideGuard(inputs: GuardInputs): GuardDecision {
  const callerId = inputs.callerId ? cleanUserId(inputs.callerId) : null;
  const targetId = cleanUserId(inputs.targetUserId);

  if (callerId && callerId === targetId) {
    return {
      ok: false,
      code: 'SELF_ACTION_FORBIDDEN',
      status: 400,
      error: 'Action impossible sur son propre compte',
    };
  }

  if (!inputs.target) {
    return {
      ok: false,
      code: 'TARGET_NOT_FOUND',
      status: 404,
      error: 'Utilisateur introuvable',
    };
  }

  if (inputs.target.isAdmin && !inputs.callerIsFounder) {
    return {
      ok: false,
      code: 'ADMIN_TARGET_FORBIDDEN',
      status: 403,
      error: 'Action impossible sur un autre administrateur',
    };
  }

  return { ok: true };
}

export function isFounderRoleName(name: string | null | undefined): boolean {
  const lowered = String(name || '').toLowerCase();
  return lowered.includes('fondateur') || lowered.includes('founder');
}
