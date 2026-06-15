import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { User, type UserType } from '../../domain/entities/user.entity';
import { UserAlreadyExistsError } from '../../domain/errors/user-already-exists.error';
import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from '../ports/password-hasher.port';
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from '../ports/user-repository.port';

// Creación admin-side. Se diferencia de `RegisterUserUseCase` en que permite
// elegir `isActive` (un admin podría crear el usuario desactivado y activarlo
// cuando le confirme algo). Si en algún punto la creación se vuelve muy
// distinta (auto-generación de password + email de invitación) merecerá su
// propio use case.
export interface CreateUserInput {
  email: string;
  password: string;
  userType: UserType;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(input: CreateUserInput): Promise<User> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new UserAlreadyExistsError(input.email);

    const passwordHash = await this.hasher.hash(input.password);
    const now = new Date();

    const user = new User(
      randomUUID(),
      input.email,
      passwordHash,
      input.firstName ?? null,
      input.lastName ?? null,
      input.userType,
      input.isActive ?? true,
      null,
      now,
      now,
    );

    return this.users.create(user);
  }
}
