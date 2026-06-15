import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error';
import {
  USER_REPOSITORY,
  type UpdateUserPatch,
  type UserRepositoryPort,
} from '../ports/user-repository.port';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
  ) {}

  async execute(id: string, patch: UpdateUserPatch): Promise<User> {
    const existing = await this.users.findById(id);
    if (!existing) throw new UserNotFoundError(id);

    // Cambio de password y de email viven en flujos aparte (con verificación).
    // Aquí solo touch: firstName, lastName, isActive.
    return this.users.update(id, patch);
  }
}
