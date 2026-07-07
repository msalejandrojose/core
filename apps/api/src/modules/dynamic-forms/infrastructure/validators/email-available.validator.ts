import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  type AsyncValidationResult,
  type AsyncValidator,
} from '../../application/ports/async-validator.port';

/**
 * Comprueba que un email no esté ya registrado en `User`. `ref: 'email-available'`.
 *
 * Acepta `context.excludeId` para no colisionar consigo mismo en formularios de
 * edición. Un valor vacío se considera válido (que lo gestione `required`).
 */
@Injectable()
export class EmailAvailableValidator implements AsyncValidator {
  readonly ref = 'email-available';

  constructor(private readonly prisma: PrismaService) {}

  async validate(
    value: unknown,
    context?: Record<string, unknown>,
  ): Promise<AsyncValidationResult> {
    if (typeof value !== 'string' || value.trim() === '') {
      return { valid: true };
    }
    const email = value.trim().toLowerCase();
    const excludeId =
      typeof context?.['excludeId'] === 'string'
        ? context['excludeId']
        : undefined;

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    const taken = existing !== null && existing.id !== excludeId;
    return taken
      ? { valid: false, message: 'Ese email ya está registrado' }
      : { valid: true };
  }
}
