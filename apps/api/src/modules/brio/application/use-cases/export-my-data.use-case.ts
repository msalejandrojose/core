import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  BRIO_ACCOUNT_REPOSITORY,
  type BrioAccountExport,
  type BrioAccountRepositoryPort,
} from '../ports/brio-account-repository.port';

@Injectable()
export class ExportMyDataUseCase {
  constructor(
    @Inject(BRIO_ACCOUNT_REPOSITORY)
    private readonly accounts: BrioAccountRepositoryPort,
  ) {}

  async execute(userId: string): Promise<BrioAccountExport> {
    const data = await this.accounts.exportAll(userId);
    if (!data) throw new NotFoundException('USER_NOT_FOUND');
    return data;
  }
}
