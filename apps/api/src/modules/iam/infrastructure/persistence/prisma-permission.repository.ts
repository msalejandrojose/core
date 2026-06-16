import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { type PermissionLevel } from '../../domain/entities/permission-level';
import {
  PermissionRepositoryPort,
  RolePermissionEntry,
  UserPermissionEntry,
} from '../../application/ports/permission-repository.port';

@Injectable()
export class PrismaPermissionRepository implements PermissionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Role permissions ----------

  async upsertRolePermission(
    roleId: string,
    sectionId: string,
    level: PermissionLevel,
  ): Promise<void> {
    await this.prisma.roleApiSectionPermission.upsert({
      where: {
        userRoleId_apiSectionId: { userRoleId: roleId, apiSectionId: sectionId },
      },
      create: {
        userRoleId: roleId,
        apiSectionId: sectionId,
        permissionLevel: level,
      },
      update: { permissionLevel: level },
    });
  }

  async deleteRolePermission(
    roleId: string,
    sectionId: string,
  ): Promise<void> {
    await this.prisma.roleApiSectionPermission.deleteMany({
      where: { userRoleId: roleId, apiSectionId: sectionId },
    });
  }

  async listRolePermissions(roleId: string): Promise<RolePermissionEntry[]> {
    const rows = await this.prisma.roleApiSectionPermission.findMany({
      where: { userRoleId: roleId },
    });
    return rows.map((r) => ({
      userRoleId: r.userRoleId,
      apiSectionId: r.apiSectionId,
      permissionLevel: r.permissionLevel as PermissionLevel,
    }));
  }

  async findRolePermissionsForRoles(
    roleIds: string[],
    sectionIds: string[],
  ): Promise<RolePermissionEntry[]> {
    if (roleIds.length === 0 || sectionIds.length === 0) return [];
    const rows = await this.prisma.roleApiSectionPermission.findMany({
      where: {
        userRoleId: { in: roleIds },
        apiSectionId: { in: sectionIds },
      },
    });
    return rows.map((r) => ({
      userRoleId: r.userRoleId,
      apiSectionId: r.apiSectionId,
      permissionLevel: r.permissionLevel as PermissionLevel,
    }));
  }

  // ---------- User overrides ----------

  async upsertUserPermission(
    userId: string,
    sectionId: string,
    level: PermissionLevel,
  ): Promise<void> {
    await this.prisma.userApiSectionPermission.upsert({
      where: {
        userId_apiSectionId: { userId, apiSectionId: sectionId },
      },
      create: {
        userId,
        apiSectionId: sectionId,
        permissionLevel: level,
      },
      update: { permissionLevel: level },
    });
  }

  async deleteUserPermission(
    userId: string,
    sectionId: string,
  ): Promise<void> {
    await this.prisma.userApiSectionPermission.deleteMany({
      where: { userId, apiSectionId: sectionId },
    });
  }

  async listUserPermissions(userId: string): Promise<UserPermissionEntry[]> {
    const rows = await this.prisma.userApiSectionPermission.findMany({
      where: { userId },
    });
    return rows.map((r) => ({
      userId: r.userId,
      apiSectionId: r.apiSectionId,
      permissionLevel: r.permissionLevel as PermissionLevel,
    }));
  }

  async findUserPermissionsForUser(
    userId: string,
    sectionIds: string[],
  ): Promise<UserPermissionEntry[]> {
    if (sectionIds.length === 0) return [];
    const rows = await this.prisma.userApiSectionPermission.findMany({
      where: { userId, apiSectionId: { in: sectionIds } },
    });
    return rows.map((r) => ({
      userId: r.userId,
      apiSectionId: r.apiSectionId,
      permissionLevel: r.permissionLevel as PermissionLevel,
    }));
  }
}
