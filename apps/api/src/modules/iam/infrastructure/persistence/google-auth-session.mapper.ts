import { GoogleAuthSession as PrismaGoogleAuthSession } from '../../../../generated/prisma/client';
import { GoogleAuthSession } from '../../domain/entities/google-auth-session.entity';

export function toGoogleAuthSessionDomain(
  row: PrismaGoogleAuthSession,
): GoogleAuthSession {
  return new GoogleAuthSession(
    row.id,
    row.state,
    row.status,
    row.accessToken,
    row.userId,
    row.failureReason,
    row.expiresAt,
  );
}
