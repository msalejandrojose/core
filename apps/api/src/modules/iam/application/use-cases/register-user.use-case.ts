import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
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
import { SendVerificationEmailUseCase } from './send-verification-email.use-case';

export interface RegisterUserInput {
  email: string;
  password: string;
  userType: UserType;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class RegisterUserUseCase {
  private readonly logger = new Logger(RegisterUserUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    private readonly sendVerificationEmail: SendVerificationEmailUseCase,
  ) {}

  async execute(input: RegisterUserInput): Promise<User> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new UserAlreadyExistsError(input.email);
    }

    const passwordHash = await this.hasher.hash(input.password);
    const now = new Date();

    // Usuario inactivo hasta que verifique el email.
    const user = new User(
      randomUUID(),
      input.email,
      passwordHash,
      input.firstName ?? null,
      input.lastName ?? null,
      input.userType,
      false, // isActive — se activa al verificar el email
      null,
      now,
      now,
    );

    const created = await this.users.create(user);

    // Disparar el email de verificación de forma best-effort: si falla,
    // el usuario existe pero puede solicitar un nuevo envío más adelante.
    try {
      await this.sendVerificationEmail.execute(created.id);
    } catch (err) {
      this.logger.error(`No se pudo enviar el email de verificación a ${input.email}: ${String(err)}`);
    }

    return created;
  }
}
