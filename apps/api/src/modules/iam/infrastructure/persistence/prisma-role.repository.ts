import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { Filter, type FindSpec, Limit, Order } from '../../../../shared/query';
import {
  filterToPrismaWhere,
  specToPrismaArgs,
} from '../../../../shared/query/prisma/from-spec';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { Role } from '../../domain/entities/role.entity';
import {
  ListRolesOptions,
  RoleRepositoryPort,
  UpdateRolePatch,
} from '../../application/ports/role-repository.port';
import { RoleMapper } from './role.mapper';

@Injectable()
export class PrismaRoleRepository implements RoleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Role | null> {
    const row = await this.prisma.userRole.findUnique({ where: { id } });
    return row ? RoleMapper.toDomain(row) : null;
  }

  async findByCode(code: string): Promise<Role | null> {
    const row = await this.prisma.userRole.findUnique({ where: { code } });
    return row ? RoleMapper.toDomain(row) : null;
  }

  // ── getRows / getRow / getCount / getDistinctValues ────────────────────

  async getRows(spec: FindSpec<Role> = {}): Promise<PaginatedResult<Role>> {
    const { where, orderBy, take, skip } = specToPrismaArgs(spec);
    const [rows, total] = await Promise.all([
      this.prisma.userRole.findMany({
        where: where as Prisma.UserRoleWhereInput,
        orderBy: orderBy as Prisma.UserRoleOrderByWithRelationInput[],
        take,
        skip,
      }),
      this.prisma.userRole.count({ where: where as Prisma.UserRoleWhereInput }),
    ]);
    return { items: rows.map(RoleMapper.toDomain), total };
  }

  async getRow(spec: FindSpec<Role>): Promise<Role | null> {
    const { where, orderBy } = specToPrismaArgs(spec);
    const row = await this.prisma.userRole.findFirst({
      where: where as Prisma.UserRoleWhereInput,
      orderBy: orderBy as Prisma.UserRoleOrderByWithRelationInput[],
    });
    return row ? RoleMapper.toDomain(row) : null;
  }

  async getCount(filter?: Filter<Role>): Promise<number> {
    const where = filterToPrismaWhere(filter);
    return this.prisma.userRole.count({ where: where as Prisma.UserRoleWhereInput });
  }

  async getDistinctValues<K extends keyof Role>(
    field: K,
    filter?: Filter<Role>,
  ): Promise<Role[K][]> {
    const where = filterToPrismaWhere(filter);
    const rows = await this.prisma.userRole.findMany({
      where: where as Prisma.UserRoleWhereInput,
      distinct: [field as Prisma.UserRoleScalarFieldEnum],
      select: { [field as string]: true } as Prisma.UserRoleSelect,
    });
    return rows.map((r) => (r as Record<string, unknown>)[field as string]) as Role[K][];
  }

  // ── Compat shim ────────────────────────────────────────────────────────

  async findMany(opts: ListRolesOptions): Promise<PaginatedResult<Role>> {
    const filter = new Filter<Role>();
    if (opts.scope !== undefined) filter.addEqualValue('scope', opts.scope);
    if (opts.codeContains) filter.addLike('code', `%${opts.codeContains}%`);

    const sort = (opts.sort ?? 'createdAt') as keyof Role;
    return this.getRows({
      filter,
      order: new Order<Role>().add(sort, opts.order),
      limit: Limit.page(opts.page, opts.limit),
    });
  }

  // ── Mutaciones ─────────────────────────────────────────────────────────

  async create(role: Role): Promise<Role> {
    const row = await this.prisma.userRole.create({
      data: RoleMapper.toPersistenceCreate(role),
    });
    return RoleMapper.toDomain(row);
  }

  async update(id: string, patch: UpdateRolePatch): Promise<Role> {
    const row = await this.prisma.userRole.update({
      where: { id },
      data: {
        name: patch.name,
        description: patch.description,
        scope: patch.scope,
        parentRoleId: patch.parentRoleId,
      },
    });
    return RoleMapper.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.userRole.delete({ where: { id } });
  }

  async isInUse(id: string): Promise<boolean> {
    const [assignmentCount, permissionCount, asParentCount] = await Promise.all([
      this.prisma.userUserRole.count({ where: { userRoleId: id } }),
      this.prisma.roleApiSectionPermission.count({ where: { userRoleId: id } }),
      this.prisma.userRole.count({ where: { parentRoleId: id } }),
    ]);
    return assignmentCount + permissionCount + asParentCount > 0;
  }

  // ── Assignments ────────────────────────────────────────────────────────

  async assignToUser(
    userId: string,
    roleId: string,
    assignedByUserId: string | null,
  ): Promise<void> {
    await this.prisma.userUserRole.create({
      data: { userId, userRoleId: roleId, assignedByUserId },
    });
  }

  async unassignFromUser(userId: string, roleId: string): Promise<void> {
    await this.prisma.userUserRole.delete({
      where: { userId_userRoleId: { userId, userRoleId: roleId } },
    });
  }

  async isAssignedToUser(userId: string, roleId: string): Promise<boolean> {
    const row = await this.prisma.userUserRole.findUnique({
      where: { userId_userRoleId: { userId, userRoleId: roleId } },
    });
    return row !== null;
  }

  async findRolesByUserId(userId: string): Promise<Role[]> {
    const rows = await this.prisma.userUserRole.findMany({
      where: { userId },
      include: { userRole: true },
    });
    return rows.map((r) => RoleMapper.toDomain(r.userRole));
  }

  async findAncestorsIncludingSelf(roleId: string): Promise<Role[]> {
    // Walk iterativo subiendo por parentRoleId. Para árboles muy profundos
    // conviene un CTE recursivo en SQL — por ahora suficiente.
    const path: Role[] = [];
    const visited = new Set<string>();
    let current = await this.findById(roleId);
    while (current && !visited.has(current.id)) {
      path.push(current);
      visited.add(current.id);
      if (!current.parentRoleId) break;
      current = await this.findById(current.parentRoleId);
    }
    return path;
  }
}
