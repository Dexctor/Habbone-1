// app/api/register/route.ts
import { NextResponse } from 'next/server';
import {
  createUser,
  getUserByNick,
  listUsersByNick,
  normalizeHotelCode,
  tryUpdateHabboSnapshotForUser,
  updateUserVerification,
} from '@/server/pocketbase/users';
import { getHabboUserByNameForHotel } from '@/server/habbo-cache';
import { RegisterBodySchema, formatZodError, buildError } from '@/types/api';
import { computeVerificationExpiry, generateVerificationCode } from '@/lib/verification';
import { parseTimestamp } from '@/lib/date-utils';
import { checkRateLimit } from '@/server/rate-limit'
import * as logger from '@/server/logger';

const RETURN_VERIFICATION_CODE = String(process.env.RETURN_VERIFICATION_CODE || 'true').toLowerCase() !== 'false';

export async function POST(req: Request) {
  try {
    // Basic rate limit: 5 attempts / 10 minutes per IP
    const rl = checkRateLimit(req, { key: 'register', limit: 5, windowMs: 10 * 60 * 1000 })
    if (!rl.ok) {
      return NextResponse.json(
        buildError('Trop de requêtes, réessayez plus tard.', { code: 'RATE_LIMITED' }),
        { status: 429, headers: rl.headers }
      )
    }

    const raw = await req.json();
    const parsed = RegisterBodySchema.safeParse({
      nick: String((raw?.nick ?? raw?.username ?? raw?.pseudo ?? raw?.Nick ?? '')).trim(),
      password: String((raw?.password ?? raw?.pass ?? '')).toString(),
      email: raw?.email ? String(raw?.email).trim() : undefined,
      hotel: raw?.hotel ?? raw?.habboHotel ?? raw?.hotelCode ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        buildError('Erreur de validation', { code: 'VALIDATION_ERROR', fields: formatZodError(parsed.error).fieldErrors }),
        { status: 400 }
      );
    }
    const { nick: n, password: p, email, hotel } = parsed.data as any;
    const hotelCode = normalizeHotelCode(hotel);
    const missao = raw?.missao ? String(raw?.missao).trim() : undefined;

    const existingUsers = await listUsersByNick(n);
    if (existingUsers.some((entry: any) => normalizeHotelCode(entry?.habbo_hotel) === hotelCode)) {
      return NextResponse.json(buildError('Ce pseudo est déjà pris pour cet hôtel.', { code: 'NICK_TAKEN' }), { status: 409 });
    }

    // Étape 1: Vérifier l'existence du joueur via Habbo API (minimiser les appels)
    let habboCore: any;
    try {
      habboCore = await getHabboUserByNameForHotel(n, hotelCode, { cache: false });
    } catch (e: any) {
      // 404 ou autre -> on bloque l'inscription si le pseudo n'existe pas côté Habbo
      const msg = e?.message || '';
      const notFound = /404/.test(msg);
      return NextResponse.json(
        buildError(notFound ? "Ce pseudo n'existe pas sur Habbo." : 'Vérification Habbo indisponible, réessayez plus tard.', { code: notFound ? 'HABBO_NOT_FOUND' : 'HABBO_UNAVAILABLE' }),
        { status: notFound ? 400 : 502 }
      );
    }

    const verificationCode = generateVerificationCode();
    const verificationExpiresAt = computeVerificationExpiry();
    const expiresAtMs = parseTimestamp(verificationExpiresAt, { numeric: 'ms', numericString: 'parse' });
    const expiresDeltaMs = expiresAtMs ? expiresAtMs - Date.now() : null;
    logger.info('[register] verification issued', {
      nick: n,
      hotel: hotelCode,
      verificationExpiresAt,
      expiresDeltaMs,
      nowIso: new Date().toISOString(),
      code: verificationCode,
    });

    // Étape 2: Créer l'utilisateur local
    const user = await createUser({
      nick: n,
      senha: p,
      email: email ?? null,
      missao,
      habboHotel: hotelCode,
      habboUniqueId: habboCore?.uniqueId ? String(habboCore.uniqueId) : null,
      verificationStatus: 'pending',
      verificationCode,
      verificationExpiresAt,
      ativado: 'n',
    });

    try {
      await updateUserVerification(String((user as any)?.id), {
        habbo_verification_status: 'pending',
        habbo_verification_code: verificationCode,
        habbo_verification_expires_at: verificationExpiresAt,
        habbo_hotel: hotelCode,
        habbo_unique_id: habboCore?.uniqueId ? String(habboCore.uniqueId) : null,
      });
    } catch (patchError) {
      logger.warn('[register] verification patch failed', { message: (patchError as any)?.message || String(patchError) });
    }

    try {
      const stored = await getUserByNick(n, hotelCode);
      logger.info('[register] stored record check', {
        nick: n,
        hasCode: Boolean(stored?.habbo_verification_code),
        storedExpires: stored?.habbo_verification_expires_at ?? null,
      });
    } catch (logError) {
      logger.warn('[register] unable to re-fetch user after creation', { message: (logError as any)?.message || String(logError) });
    }

    // Étape 3: Stocker un snapshot basique (best-effort, n'échoue pas l'inscription)
    void tryUpdateHabboSnapshotForUser(String((user as any).id), habboCore);

    const payload: any = {
      ok: true,
      id: (user as any).id,
      habboUniqueId: habboCore?.uniqueId ?? null,
      needsVerification: true,
      verification: {
        ...(RETURN_VERIFICATION_CODE ? { code: verificationCode } : {}),
        expiresAt: verificationExpiresAt,
        hotel: hotelCode,
      },
    };
    return NextResponse.json(payload);
  } catch (e: any) {
    const message = e?.message || 'Erreur serveur';
    const uniqueNick = /UNIQUE constraint failed|duplicate key value/i.test(message);
    if (uniqueNick) {
      return NextResponse.json(buildError('Ce compte Habbo est déjà lié à un utilisateur.', { code: 'HABBO_ALREADY_LINKED' }), {
        status: 409,
      });
    }
    logger.error('[register] server error', { message: (e as any)?.message || String(e) });
    return NextResponse.json(buildError(e?.message || 'Erreur serveur', { code: 'SERVER_ERROR' }), { status: 500 });
  }
}
