import { Inject, Injectable } from '@nestjs/common';
import {
  BRIO_ACCOUNT_REPOSITORY,
  type BrioAccountRepositoryPort,
} from '../ports/brio-account-repository.port';

/**
 * Borrado definitivo de la cuenta (no soft delete): el diseño promete que se
 * elimina todo y no se puede deshacer. Idempotente: si ya no existe, no falla.
 */
@Injectable()
export class DeleteMyAccountUseCase {
  constructor(
    @Inject(BRIO_ACCOUNT_REPOSITORY)
    private readonly accounts: BrioAccountRepositoryPort,
  ) {}

  async execute(userId: string): Promise<void> {
    await this.accounts.deleteAccount(userId);
  }
}
