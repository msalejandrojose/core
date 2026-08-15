import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { FriendCodeRepositoryPort } from '../../application/ports/friend-code-repository.port';
import { FriendCode } from '../../domain/entities/friend-code.entity';
import { generateFriendCode } from '../../domain/generate-friend-code';

// Cuántas veces se reintenta generar un código nuevo si el sorteado ya
// existe. Con un alfabeto de 32 símbolos y 8 caracteres el espacio es de
// 32^8 (~1,1 billones) — una colisión real es prácticamente imposible, esto
// es solo para no dejar el alta colgada si alguna vez pasa.
const MAX_ATTEMPTS = 5;

function isUniqueCodeViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    Array.isArray((error.meta as { target?: unknown })?.target) &&
    (error.meta as { target: string[] }).target.includes('code')
  );
}

@Injectable()
export class PrismaFriendCodeRepository implements FriendCodeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByCode(code: string): Promise<FriendCode | null> {
    const row = await this.prisma.racingFriendCode.findUnique({
      where: { code },
    });
    return row === null ? null : this.toDomain(row);
  }

  async getOrCreate(userId: string): Promise<FriendCode> {
    const existing = await this.prisma.racingFriendCode.findUnique({
      where: { userId },
    });
    if (existing !== null) return this.toDomain(existing);

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const row = await this.prisma.racingFriendCode.create({
          data: { userId, code: generateFriendCode() },
        });
        return this.toDomain(row);
      } catch (error) {
        if (!isUniqueCodeViolation(error)) throw error;
        // Colisión de código: se reintenta con uno nuevo. Si el propio
        // `userId` colisionó (petición duplicada en paralelo), la fila ya
        // existe y toca leerla en vez de seguir intentando.
        const raced = await this.prisma.racingFriendCode.findUnique({
          where: { userId },
        });
        if (raced !== null) return this.toDomain(raced);
      }
    }

    throw new Error(
      `No se pudo generar un código de amigo único tras ${MAX_ATTEMPTS} intentos.`,
    );
  }

  private toDomain(row: {
    userId: string;
    code: string;
    createdAt: Date;
  }): FriendCode {
    return new FriendCode(row.userId, row.code, row.createdAt);
  }
}
