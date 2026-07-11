import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';

// ===== Auth =====
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LoginWithGoogleUseCase } from './application/use-cases/login-with-google.use-case';
import { LoginWithFacebookUseCase } from './application/use-cases/login-with-facebook.use-case';
import { ResolveSocialUserUseCase } from './application/use-cases/resolve-social-user.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { SendVerificationEmailUseCase } from './application/use-cases/send-verification-email.use-case';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.use-case';
import { RequestPasswordResetUseCase } from './application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case';
// ===== Users CRUD =====
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { DeactivateUserUseCase } from './application/use-cases/deactivate-user.use-case';
import { GetUserUseCase } from './application/use-cases/get-user.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
// ===== Roles =====
import { AssignRoleToUserUseCase } from './application/use-cases/assign-role-to-user.use-case';
import { CreateRoleUseCase } from './application/use-cases/create-role.use-case';
import { DeleteRoleUseCase } from './application/use-cases/delete-role.use-case';
import { GetRoleUseCase } from './application/use-cases/get-role.use-case';
import { ListRolesUseCase } from './application/use-cases/list-roles.use-case';
import { ListUserRolesUseCase } from './application/use-cases/list-user-roles.use-case';
import { UnassignRoleFromUserUseCase } from './application/use-cases/unassign-role-from-user.use-case';
import { UpdateRoleUseCase } from './application/use-cases/update-role.use-case';
// ===== API sections =====
import { CreateApiSectionUseCase } from './application/use-cases/create-api-section.use-case';
import { DeleteApiSectionUseCase } from './application/use-cases/delete-api-section.use-case';
import { GetApiSectionUseCase } from './application/use-cases/get-api-section.use-case';
import { ListApiSectionsUseCase } from './application/use-cases/list-api-sections.use-case';
import { UpdateApiSectionUseCase } from './application/use-cases/update-api-section.use-case';
// ===== Permissions =====
import { GrantRolePermissionUseCase } from './application/use-cases/grant-role-permission.use-case';
import { GrantUserPermissionUseCase } from './application/use-cases/grant-user-permission.use-case';
import { ListRolePermissionsUseCase } from './application/use-cases/list-role-permissions.use-case';
import { ListUserPermissionsUseCase } from './application/use-cases/list-user-permissions.use-case';
import { ResolvePermissionUseCase } from './application/use-cases/resolve-permission.use-case';
import { RevokeRolePermissionUseCase } from './application/use-cases/revoke-role-permission.use-case';
import { RevokeUserPermissionUseCase } from './application/use-cases/revoke-user-permission.use-case';

// ===== Ports =====
import { API_SECTION_REPOSITORY } from './application/ports/api-section-repository.port';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { PERMISSION_REPOSITORY } from './application/ports/permission-repository.port';
import { ROLE_REPOSITORY } from './application/ports/role-repository.port';
import { TOKEN_ISSUER } from './application/ports/token-issuer.port';
import { USER_REPOSITORY } from './application/ports/user-repository.port';
import { GOOGLE_TOKEN_VERIFIER } from './application/ports/google-token-verifier.port';
import { FACEBOOK_TOKEN_VERIFIER } from './application/ports/facebook-token-verifier.port';

// ===== Adapters =====
import { Argon2PasswordHasher } from './infrastructure/crypto/argon2-password-hasher';
import { JwtTokenIssuer } from './infrastructure/crypto/jwt-token-issuer';
import { PrismaApiSectionRepository } from './infrastructure/persistence/prisma-api-section.repository';
import { PrismaPermissionRepository } from './infrastructure/persistence/prisma-permission.repository';
import { PrismaRoleRepository } from './infrastructure/persistence/prisma-role.repository';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { GoogleTokenVerifier } from './infrastructure/social/google-token-verifier';
import { FacebookTokenVerifier } from './infrastructure/social/facebook-token-verifier';

// ===== HTTP =====
import { ApiSectionsController } from './infrastructure/http/api-sections.controller';
import { AuthController } from './infrastructure/http/auth.controller';
import { RolePermissionsController } from './infrastructure/http/role-permissions.controller';
import { RolesController } from './infrastructure/http/roles.controller';
import { UserPermissionsController } from './infrastructure/http/user-permissions.controller';
import { UserRolesController } from './infrastructure/http/user-roles.controller';
import { UsersController } from './infrastructure/http/users.controller';
import { JwtAuthGuard } from './infrastructure/http/guards/jwt-auth.guard';
import { PermissionGuard } from './infrastructure/http/guards/permission.guard';

// ===== Mailer =====
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '60m') as
            | `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`
            | number,
        },
      }),
    }),
    MailerModule,
  ],
  controllers: [
    AuthController,
    UsersController,
    RolesController,
    UserRolesController,
    ApiSectionsController,
    RolePermissionsController,
    UserPermissionsController,
  ],
  providers: [
    // Auth use cases
    RegisterUserUseCase,
    LoginUseCase,
    LoginWithGoogleUseCase,
    LoginWithFacebookUseCase,
    ResolveSocialUserUseCase,
    GetCurrentUserUseCase,
    SendVerificationEmailUseCase,
    VerifyEmailUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    ChangePasswordUseCase,

    // Users use cases
    ListUsersUseCase,
    GetUserUseCase,
    CreateUserUseCase,
    UpdateUserUseCase,
    DeactivateUserUseCase,

    // Roles use cases
    ListRolesUseCase,
    GetRoleUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
    AssignRoleToUserUseCase,
    UnassignRoleFromUserUseCase,
    ListUserRolesUseCase,

    // API sections use cases
    ListApiSectionsUseCase,
    GetApiSectionUseCase,
    CreateApiSectionUseCase,
    UpdateApiSectionUseCase,
    DeleteApiSectionUseCase,

    // Permissions use cases
    GrantRolePermissionUseCase,
    RevokeRolePermissionUseCase,
    ListRolePermissionsUseCase,
    GrantUserPermissionUseCase,
    RevokeUserPermissionUseCase,
    ListUserPermissionsUseCase,
    ResolvePermissionUseCase,

    // Puertos → adapters
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: ROLE_REPOSITORY, useClass: PrismaRoleRepository },
    { provide: API_SECTION_REPOSITORY, useClass: PrismaApiSectionRepository },
    { provide: PERMISSION_REPOSITORY, useClass: PrismaPermissionRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
    { provide: GOOGLE_TOKEN_VERIFIER, useClass: GoogleTokenVerifier },
    { provide: FACEBOOK_TOKEN_VERIFIER, useClass: FacebookTokenVerifier },

    // Guards locales como singletons del container (los reusan los APP_GUARD
    // de abajo vía `useExisting` para no duplicar instancias).
    JwtAuthGuard,
    PermissionGuard,

    // Guards GLOBALES — se aplican a TODAS las rutas. JwtAuthGuard primero
    // (deja `req.user`), PermissionGuard después (chequea permisos si el
    // endpoint tiene `@RequiresPermission`). Opt-out: `@Public()`.
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: PermissionGuard },
  ],
  exports: [
    JwtAuthGuard,
    PermissionGuard,
    ResolvePermissionUseCase,
    TOKEN_ISSUER,
    ROLE_REPOSITORY,
    // Consumido por el resolver de target `users` de WorkflowsModule.
    USER_REPOSITORY,
  ],
})
export class IamModule {}
