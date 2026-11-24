import { User } from '../../domain/entities/user.entity';
import { SessionExpiredError } from '../../domain/errors/session-expired.error';
import { ROTATION_GRACE_MS, decideRefresh } from '../../domain/services/auth-session';
import { sha256Hex } from '../../domain/services/oauth';
import type {
  AuthSessionRecord,
  AuthSessionRepositoryPort,
} from '../ports/auth-session-repository.port';
import type { TokenIssuerPort } from '../ports/token-issuer.port';
import type { UserRepositoryPort } from '../ports/user-repository.port';
import { AuthSessionsUseCase } from './auth-sessions.use-case';

/** Repositorio en memoria con la misma semántica que el de Prisma. */
function memoryRepo() {
  const rows: (AuthSessionRecord & {
    refreshTokenHash: string;
    previousTokenHash: string | null;
  })[] = [];
  const repo: AuthSessionRepositoryPort = {
    async create(d) {
      rows.push({
        id: `s${rows.length + 1}`,
        userId: d.userId,
        refreshTokenHash: d.refreshTokenHash,
        previousTokenHash: null,
        expiresAt: d.expiresAt,
        revokedAt: null,
        rotatedAt: null,
      });
    },
    async findByTokenHash(hash) {
      const r = rows.find(
        (x) => x.refreshTokenHash === hash || x.previousTokenHash === hash,
      );
      if (!r) return null;
      return {
        session: { ...r },
        match: r.refreshTokenHash === hash ? 'current' : 'previous',
      };
    },
    async rotate(id, currentHash, next) {
      const r = rows.find((x) => x.id === id);
      if (!r || r.refreshTokenHash !== currentHash || r.revokedAt) return false;
      r.previousTokenHash = currentHash;
      r.refreshTokenHash = next.refreshTokenHash;
      r.rotatedAt = next.now;
      r.expiresAt = next.expiresAt;
      return true;
    },
    async revoke(id, now) {
      const r = rows.find((x) => x.id === id);
      if (r && !r.revokedAt) r.revokedAt = now;
    },
  };
  return { repo, rows };
}

const user = { id: 'u1', email: 'a@b.c', userType: 'APP', isDeactivated: () => false } as unknown as User;

function setup() {
  const { repo, rows } = memoryRepo();
  const users = { findById: jest.fn().mockResolvedValue(user) } as unknown as UserRepositoryPort;
  let n = 0;
  const tokens: TokenIssuerPort = {
    issue: jest.fn(async () => `jwt-${++n}`),
    verify: jest.fn(),
  };
  return { uc: new AuthSessionsUseCase(repo, users, tokens), rows, users };
}

describe('AuthSessionsUseCase', () => {
  afterEach(() => jest.useRealTimers());

  it('abre una sesión guardando solo el hash del refresh token', async () => {
    const { uc, rows } = setup();
    const rt = await uc.open('u1', 'Brio/1.0');
    expect(rows).toHaveLength(1);
    expect(rows[0].refreshTokenHash).toBe(sha256Hex(rt));
    expect(rows[0].refreshTokenHash).not.toBe(rt);
  });

  it('refrescar rota el token: el nuevo vale y el viejo pasa a ser el anterior', async () => {
    const { uc, rows } = setup();
    const rt = await uc.open('u1');
    const res = await uc.refresh(rt);
    expect(res.accessToken).toBe('jwt-1');
    expect(res.refreshToken).not.toBe(rt);
    expect(rows[0].refreshTokenHash).toBe(sha256Hex(res.refreshToken));
    expect(rows[0].previousTokenHash).toBe(sha256Hex(rt));
    // Encadenar refrescos sigue funcionando.
    await expect(uc.refresh(res.refreshToken)).resolves.toMatchObject({ accessToken: 'jwt-2' });
  });

  it('el token anterior dentro del margen abre una sesión hermana sin tumbar la original', async () => {
    const { uc, rows } = setup();
    const rt = await uc.open('u1');
    const first = await uc.refresh(rt);
    const again = await uc.refresh(rt); // la respuesta del primero se perdió
    expect(rows).toHaveLength(2);
    expect(rows[0].revokedAt).toBeNull();
    await expect(uc.refresh(first.refreshToken)).resolves.toBeDefined();
    await expect(uc.refresh(again.refreshToken)).resolves.toBeDefined();
  });

  it('el token anterior fuera del margen revoca la sesión', async () => {
    const { uc, rows } = setup();
    const rt = await uc.open('u1');
    const first = await uc.refresh(rt);
    jest.useFakeTimers().setSystemTime(Date.now() + ROTATION_GRACE_MS + 1000);
    await expect(uc.refresh(rt)).rejects.toBeInstanceOf(SessionExpiredError);
    expect(rows[0].revokedAt).not.toBeNull();
    await expect(uc.refresh(first.refreshToken)).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it('rechaza tokens desconocidos, sesiones cerradas y usuarios desactivados', async () => {
    const { uc, users } = setup();
    await expect(uc.refresh('no-existe-no-existe-no')).rejects.toBeInstanceOf(SessionExpiredError);

    const rt = await uc.open('u1');
    await uc.close(rt);
    await expect(uc.refresh(rt)).rejects.toBeInstanceOf(SessionExpiredError);

    const rt2 = await uc.open('u1');
    (users.findById as jest.Mock).mockResolvedValueOnce({ ...user, isDeactivated: () => true });
    await expect(uc.refresh(rt2)).rejects.toBeInstanceOf(SessionExpiredError);
  });
});

describe('decideRefresh', () => {
  const now = new Date('2026-11-24T12:00:00Z');
  const base = { expiresAt: new Date('2027-01-01'), revokedAt: null, rotatedAt: null };

  it('rechaza si la sesión ha caducado', () => {
    expect(decideRefresh({ ...base, expiresAt: new Date('2026-11-01') }, 'current', now)).toEqual({ kind: 'reject' });
  });

  it('rota con el token actual', () => {
    expect(decideRefresh(base, 'current', now)).toEqual({ kind: 'rotate' });
  });
});
