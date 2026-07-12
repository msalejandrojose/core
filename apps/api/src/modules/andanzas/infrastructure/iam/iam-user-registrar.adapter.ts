import { Injectable } from '@nestjs/common';
import { RegisterUserUseCase } from '../../../iam/application/use-cases/register-user.use-case';
import {
  RegisterAppUserInput,
  RegisteredUser,
  UserRegistrarPort,
} from '../../application/ports/user-registrar.port';

@Injectable()
export class IamUserRegistrarAdapter implements UserRegistrarPort {
  constructor(private readonly registerUser: RegisterUserUseCase) {}

  async registerAppUser(input: RegisterAppUserInput): Promise<RegisteredUser> {
    const user = await this.registerUser.execute({
      ...input,
      userType: 'APP',
    });
    return { id: user.id };
  }
}
