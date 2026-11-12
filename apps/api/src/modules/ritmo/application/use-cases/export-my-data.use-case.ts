import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  RITMO_ACCOUNT_REPOSITORY,
  type RitmoAccountExport,
  type RitmoAccountRepositoryPort,
} from '../ports/ritmo-account-repository.port';

@Injectable()
export class ExportMyDataUseCase {
  constructor(
    @Inject(RITMO_ACCOUNT_REPOSITORY)
    private readonly accounts: RitmoAccountRepositoryPort,
  ) {}

  async execute(userId: string): Promise<RitmoAccountExport> {
    const data = await this.accounts.exportAll(userId);
    if (!data) throw new NotFoundException('USER_NOT_FOUND');
    return data;
  }
}
