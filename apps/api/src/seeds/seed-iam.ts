import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from '../modules/iam/application/ports/password-hasher.port';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

// Seed idempotente. Se puede correr N veces sin duplicar.
//
// Crea:
//   - Árbol de secciones: root → iam → {users, roles, api_sections, permissions}
//   - Rol "admin" (scope SHARED)
//   - Permiso ADMIN del rol admin sobre la sección "root" (cubre todo por
//     herencia de secciones).
//   - Usuario admin (email/password vía env, defaults documentados).
//   - Asignación del rol admin al usuario admin.

const DEFAULT_ADMIN_EMAIL = 'admin@core.dev';
const DEFAULT_ADMIN_PASSWORD = 'admin-change-me';
const ADMIN_ROLE_CODE = 'admin';
const ROOT_SECTION_CODE = 'root';

const SECTIONS: ReadonlyArray<{
  code: string;
  name: string;
  parent: string | null;
  description: string | null;
}> = [
  { code: 'root', name: 'Root', parent: null, description: 'Sección raíz de toda la API.' },
  { code: 'iam', name: 'IAM', parent: 'root', description: 'Identity & Access Management.' },
  { code: 'iam.users', name: 'IAM · Users', parent: 'iam', description: null },
  { code: 'iam.roles', name: 'IAM · Roles', parent: 'iam', description: null },
  { code: 'iam.api_sections', name: 'IAM · API Sections', parent: 'iam', description: null },
  { code: 'iam.permissions', name: 'IAM · Permissions', parent: 'iam', description: null },
];

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  const prisma = app.get(PrismaService);
  const hasher = app.get<PasswordHasherPort>(PASSWORD_HASHER);

  console.log('→ Sembrando árbol de secciones...');
  const idByCode = new Map<string, string>();
  for (const s of SECTIONS) {
    let row = await prisma.apiSection.findUnique({ where: { code: s.code } });
    if (!row) {
      const parentId = s.parent ? idByCode.get(s.parent) ?? null : null;
      row = await prisma.apiSection.create({
        data: {
          id: randomUUID(),
          code: s.code,
          name: s.name,
          description: s.description,
          parentSectionId: parentId,
        },
      });
      console.log(`  + ${s.code}`);
    }
    idByCode.set(s.code, row.id);
  }
  const rootSectionId = idByCode.get(ROOT_SECTION_CODE)!;

  console.log('→ Sembrando rol admin...');
  let adminRole = await prisma.userRole.findUnique({
    where: { code: ADMIN_ROLE_CODE },
  });
  if (!adminRole) {
    adminRole = await prisma.userRole.create({
      data: {
        id: randomUUID(),
        code: ADMIN_ROLE_CODE,
        name: 'Administrator',
        description: 'Acceso total a la API (seed).',
        scope: 'SHARED',
      },
    });
    console.log(`  + ${ADMIN_ROLE_CODE}`);
  }

  console.log('→ Sembrando permiso ADMIN admin → root...');
  await prisma.roleApiSectionPermission.upsert({
    where: {
      userRoleId_apiSectionId: {
        userRoleId: adminRole.id,
        apiSectionId: rootSectionId,
      },
    },
    create: {
      userRoleId: adminRole.id,
      apiSectionId: rootSectionId,
      permissionLevel: 'ADMIN',
    },
    update: { permissionLevel: 'ADMIN' },
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL;
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;

  console.log(`→ Sembrando usuario admin (${adminEmail})...`);
  let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  let createdUser = false;
  if (!adminUser) {
    const passwordHash = await hasher.hash(adminPassword);
    adminUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: adminEmail,
        passwordHash,
        firstName: 'Admin',
        lastName: 'Core',
        userType: 'BACKOFFICE',
        isActive: true,
      },
    });
    createdUser = true;
    console.log('  + creado');
  } else {
    console.log('  ya existía, no modifico password.');
  }

  console.log('→ Asignando rol admin al usuario admin...');
  await prisma.userUserRole.upsert({
    where: {
      userId_userRoleId: {
        userId: adminUser.id,
        userRoleId: adminRole.id,
      },
    },
    create: {
      userId: adminUser.id,
      userRoleId: adminRole.id,
      assignedByUserId: null,
    },
    update: {},
  });

  console.log('');
  console.log('✓ Seed completado.');
  console.log(`  Login:      ${adminEmail}`);
  if (createdUser && !process.env.SEED_ADMIN_PASSWORD) {
    console.log(`  Password:   ${DEFAULT_ADMIN_PASSWORD}`);
    console.log('  ⚠️  Cambia esta password tras el primer login.');
  }

  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
