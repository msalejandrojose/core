import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error';
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from '../ports/user-repository.port';

// Soft delete: marca isActive=false. La fila se mantiene para auditoría y
// para que las FKs históricas (assignedBy, etc.) no queden huérfanas.
@Injectable()
export class DeactivateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
  ) {}

  async execute(id: string): Promise<User> {
    const existing = await this.users.findById(id);
    if (!existing) throw new UserNotFoundError(id);
    if (!existing.isActive) return existing; // idempotente
    return this.users.deactivate(id);
  }
}
