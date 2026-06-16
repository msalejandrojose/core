import { ApiSection } from '../../domain/entities/api-section.entity';
import { Role } from '../../domain/entities/role.entity';
import { type PermissionLevel } from '../../domain/entities/permission-level';
import type { ApiSectionRepositoryPort } from '../ports/api-section-repository.port';
import type {
  PermissionRepositoryPort,
  RolePermissionEntry,
  UserPermissionEntry,
} from '../ports/permission-repository.port';
import type { RoleRepositoryPort } from '../ports/role-repository.port';
import { ResolvePermissionUseCase } from './resolve-permission.use-case';

// Helpers
function makeSection(id: string, code: string, parentId: string | null = null): ApiSection {
  return new ApiSection(id, code, code, null, parentId, new Date(), new Date());
}
function makeRole(id: string, code: string, parentId: string | null = null): Role {
  return new Role(id, code, code, null, 'SHARED', parentId, new Date(), new Date());
}

// Mock factory
function buildMocks(): {
  roles: jest.Mocked<RoleRepositoryPort>;
  sections: jest.Mocked<ApiSectionRepositoryPort>;
  permissions: jest.Mocked<PermissionRepositoryPort>;
} {
  return {
    roles: {
      findById: jest.fn(),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      isInUse: jest.fn(),
      assignToUser: jest.fn(),
      unassignFromUser: jest.fn(),
      isAssignedToUser: jest.fn(),
      findRolesByUserId: jest.fn(),
      findAncestorsIncludingSelf: jest.fn(),
    },
    sections: {
      findById: jest.fn(),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      isInUse: jest.fn(),
      findAncestorsIncludingSelf: jest.fn(),
    },
    permissions: {
      upsertRolePermission: jest.fn(),
      deleteRolePermission: jest.fn(),
      listRolePermissions: jest.fn(),
      findRolePermissionsForRoles: jest.fn(),
      upsertUserPermission: jest.fn(),
      deleteUserPermission: jest.fn(),
      listUserPermissions: jest.fn(),
      findUserPermissionsForUser: jest.fn(),
    },
  };
}

describe('ResolvePermissionUseCase', () => {
  const userId = 'user-1';

  function rolePerm(
    userRoleId: string,
    apiSectionId: string,
    permissionLevel: PermissionLevel,
  ): RolePermissionEntry {
    return { userRoleId, apiSectionId, permissionLevel };
  }

  function userPerm(
    apiSectionId: string,
    permissionLevel: PermissionLevel,
  ): UserPermissionEntry {
    return { userId, apiSectionId, permissionLevel };
  }

  it('niega si la sección no existe', async () => {
    const m = buildMocks();
    m.sections.findByCode.mockResolvedValue(null);
    const sut = new ResolvePermissionUseCase(m.roles, m.sections, m.permissions);
    expect(await sut.isAllowed(userId, 'ghost', 'READ')).toBe(false);
  });

  it('niega si el usuario no tiene roles y no hay override', async () => {
    const m = buildMocks();
    const root = makeSection('s-root', 'root');
    m.sections.findByCode.mockResolvedValue(root);
    m.sections.findAncestorsIncludingSelf.mockResolvedValue([root]);
    m.permissions.findUserPermissionsForUser.mockResolvedValue([]);
    m.roles.findRolesByUserId.mockResolvedValue([]);
    const sut = new ResolvePermissionUseCase(m.roles, m.sections, m.permissions);
    expect(await sut.isAllowed(userId, 'root', 'READ')).toBe(false);
  });

  it('override de usuario directo permite cuando satisface', async () => {
    const m = buildMocks();
    const sec = makeSection('s', 'users');
    m.sections.findByCode.mockResolvedValue(sec);
    m.sections.findAncestorsIncludingSelf.mockResolvedValue([sec]);
    m.permissions.findUserPermissionsForUser.mockResolvedValue([
      userPerm('s', 'WRITE'),
    ]);
    const sut = new ResolvePermissionUseCase(m.roles, m.sections, m.permissions);
    expect(await sut.isAllowed(userId, 'users', 'READ')).toBe(true);
    expect(await sut.isAllowed(userId, 'users', 'WRITE')).toBe(true);
    expect(await sut.isAllowed(userId, 'users', 'DELETE')).toBe(false);
  });

  it('override de usuario NONE bloquea aunque haya permisos por rol', async () => {
    const m = buildMocks();
    const sec = makeSection('s', 'users');
    m.sections.findByCode.mockResolvedValue(sec);
    m.sections.findAncestorsIncludingSelf.mockResolvedValue([sec]);
    m.permissions.findUserPermissionsForUser.mockResolvedValue([
      userPerm('s', 'NONE'),
    ]);
    // No deberían consultarse roles, pero por si lo hace:
    m.roles.findRolesByUserId.mockResolvedValue([makeRole('r', 'admin')]);
    m.roles.findAncestorsIncludingSelf.mockResolvedValue([makeRole('r', 'admin')]);
    m.permissions.findRolePermissionsForRoles.mockResolvedValue([
      rolePerm('r', 's', 'ADMIN'),
    ]);
    const sut = new ResolvePermissionUseCase(m.roles, m.sections, m.permissions);
    expect(await sut.isAllowed(userId, 'users', 'READ')).toBe(false);
  });

  it('override de usuario sobre ANCESTRO aplica si no hay match más específico', async () => {
    const m = buildMocks();
    const parent = makeSection('parent', 'users');
    const child = makeSection('child', 'users.create', 'parent');
    m.sections.findByCode.mockResolvedValue(child);
    m.sections.findAncestorsIncludingSelf.mockResolvedValue([child, parent]);
    m.permissions.findUserPermissionsForUser.mockResolvedValue([
      userPerm('parent', 'WRITE'),
    ]);
    const sut = new ResolvePermissionUseCase(m.roles, m.sections, m.permissions);
    expect(await sut.isAllowed(userId, 'users.create', 'WRITE')).toBe(true);
  });

  it('match más específico gana sobre ancestro', async () => {
    const m = buildMocks();
    const parent = makeSection('parent', 'users');
    const child = makeSection('child', 'users.create', 'parent');
    m.sections.findByCode.mockResolvedValue(child);
    m.sections.findAncestorsIncludingSelf.mockResolvedValue([child, parent]);
    // El padre permite WRITE, pero el hijo dice NONE. NONE en el hijo bloquea.
    m.permissions.findUserPermissionsForUser.mockResolvedValue([
      userPerm('child', 'NONE'),
      userPerm('parent', 'WRITE'),
    ]);
    const sut = new ResolvePermissionUseCase(m.roles, m.sections, m.permissions);
    expect(await sut.isAllowed(userId, 'users.create', 'READ')).toBe(false);
  });

  it('rol con permiso directo permite si satisface el nivel', async () => {
    const m = buildMocks();
    const sec = makeSection('s', 'users');
    m.sections.findByCode.mockResolvedValue(sec);
    m.sections.findAncestorsIncludingSelf.mockResolvedValue([sec]);
    m.permissions.findUserPermissionsForUser.mockResolvedValue([]);
    const role = makeRole('r', 'editor');
    m.roles.findRolesByUserId.mockResolvedValue([role]);
    m.roles.findAncestorsIncludingSelf.mockResolvedValue([role]);
    m.permissions.findRolePermissionsForRoles.mockResolvedValue([
      rolePerm('r', 's', 'WRITE'),
    ]);
    const sut = new ResolvePermissionUseCase(m.roles, m.sections, m.permissions);
    expect(await sut.isAllowed(userId, 'users', 'WRITE')).toBe(true);
    expect(await sut.isAllowed(userId, 'users', 'DELETE')).toBe(false);
  });

  it('rol NONE bloquea siempre (deny wins)', async () => {
    const m = buildMocks();
    const sec = makeSection('s', 'users');
    m.sections.findByCode.mockResolvedValue(sec);
    m.sections.findAncestorsIncludingSelf.mockResolvedValue([sec]);
    m.permissions.findUserPermissionsForUser.mockResolvedValue([]);
    const role = makeRole('r', 'blocked');
    m.roles.findRolesByUserId.mockResolvedValue([role]);
    m.roles.findAncestorsIncludingSelf.mockResolvedValue([role]);
    m.permissions.findRolePermissionsForRoles.mockResolvedValue([
      rolePerm('r', 's', 'NONE'),
    ]);
    const sut = new ResolvePermissionUseCase(m.roles, m.sections, m.permissions);
    expect(await sut.isAllowed(userId, 'users', 'READ')).toBe(false);
  });

  it('herencia entre roles: si el rol padre tiene permiso, lo usa el hijo', async () => {
    const m = buildMocks();
    const sec = makeSection('s', 'users');
    m.sections.findByCode.mockResolvedValue(sec);
    m.sections.findAncestorsIncludingSelf.mockResolvedValue([sec]);
    m.permissions.findUserPermissionsForUser.mockResolvedValue([]);
    const child = makeRole('r-child', 'editor', 'r-parent');
    const parent = makeRole('r-parent', 'manager');
    m.roles.findRolesByUserId.mockResolvedValue([child]);
    m.roles.findAncestorsIncludingSelf.mockResolvedValue([child, parent]);
    m.permissions.findRolePermissionsForRoles.mockResolvedValue([
      rolePerm('r-parent', 's', 'ADMIN'),
    ]);
    const sut = new ResolvePermissionUseCase(m.roles, m.sections, m.permissions);
    expect(await sut.isAllowed(userId, 'users', 'ADMIN')).toBe(true);
  });

  it('herencia entre secciones: rol con permiso en padre se aplica al hijo', async () => {
    const m = buildMocks();
    const parent = makeSection('s-parent', 'iam');
    const child = makeSection('s-child', 'iam.users', 's-parent');
    m.sections.findByCode.mockResolvedValue(child);
    m.sections.findAncestorsIncludingSelf.mockResolvedValue([child, parent]);
    m.permissions.findUserPermissionsForUser.mockResolvedValue([]);
    const role = makeRole('r', 'admin');
    m.roles.findRolesByUserId.mockResolvedValue([role]);
    m.roles.findAncestorsIncludingSelf.mockResolvedValue([role]);
    m.permissions.findRolePermissionsForRoles.mockResolvedValue([
      rolePerm('r', 's-parent', 'ADMIN'),
    ]);
    const sut = new ResolvePermissionUseCase(m.roles, m.sections, m.permissions);
    expect(await sut.isAllowed(userId, 'iam.users', 'DELETE')).toBe(true);
  });

  it('múltiples roles: el mejor nivel gana', async () => {
    const m = buildMocks();
    const sec = makeSection('s', 'users');
    m.sections.findByCode.mockResolvedValue(sec);
    m.sections.findAncestorsIncludingSelf.mockResolvedValue([sec]);
    m.permissions.findUserPermissionsForUser.mockResolvedValue([]);
    const r1 = makeRole('r1', 'reader');
    const r2 = makeRole('r2', 'writer');
    m.roles.findRolesByUserId.mockResolvedValue([r1, r2]);
    // El walk va rol-a-rol con su propia cadena. Cada rol consulta sus perms.
    m.roles.findAncestorsIncludingSelf
      .mockImplementationOnce(async () => [r1])
      .mockImplementationOnce(async () => [r2]);
    m.permissions.findRolePermissionsForRoles
      .mockImplementationOnce(async () => [rolePerm('r1', 's', 'READ')])
      .mockImplementationOnce(async () => [rolePerm('r2', 's', 'DELETE')]);
    const sut = new ResolvePermissionUseCase(m.roles, m.sections, m.permissions);
    expect(await sut.isAllowed(userId, 'users', 'DELETE')).toBe(true);
  });

  it('múltiples roles: NONE en uno bloquea aunque otro permita', async () => {
    const m = buildMocks();
    const sec = makeSection('s', 'users');
    m.sections.findByCode.mockResolvedValue(sec);
    m.sections.findAncestorsIncludingSelf.mockResolvedValue([sec]);
    m.permissions.findUserPermissionsForUser.mockResolvedValue([]);
    const r1 = makeRole('r1', 'blocked');
    const r2 = makeRole('r2', 'allowed');
    m.roles.findRolesByUserId.mockResolvedValue([r1, r2]);
    m.roles.findAncestorsIncludingSelf
      .mockImplementationOnce(async () => [r1])
      .mockImplementationOnce(async () => [r2]);
    m.permissions.findRolePermissionsForRoles
      .mockImplementationOnce(async () => [rolePerm('r1', 's', 'NONE')])
      .mockImplementationOnce(async () => [rolePerm('r2', 's', 'ADMIN')]);
    const sut = new ResolvePermissionUseCase(m.roles, m.sections, m.permissions);
    expect(await sut.isAllowed(userId, 'users', 'READ')).toBe(false);
  });
});
