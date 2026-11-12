import { Inject, Injectable } from '@nestjs/common';
import {
  RITMO_ACCOUNT_REPOSITORY,
  type RitmoAccountRepositoryPort,
} from '../ports/ritmo-account-repository.port';

/**
 * Borrado definitivo de la cuenta (no soft delete): el diseño promete que se
 * elimina todo y no se puede deshacer. Idempotente: si ya no existe, no falla.
 */
@Injectable()
export class DeleteMyAccountUseCase {
  constructor(
    @Inject(RITMO_ACCOUNT_REPOSITORY)
    private readonly accounts: RitmoAccountRepositoryPort,
  ) {}

  async execute(userId: string): Promise<void> {
    await this.accounts.deleteAccount(userId);
  }
}
