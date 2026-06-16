import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error';
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from '../ports/user-repository.port';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
  ) {}

  async execute(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    // Si el token es válido pero el usuario ya no existe (borrado), tratamos
    // como "not found". El guard ya valida que el token esté firmado.
    if (!user) {
      throw new UserNotFoundError(userId);
    }
    return user;
  }
}
