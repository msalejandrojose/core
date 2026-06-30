import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

// Seed idempotente del árbol BACKOFFICE inicial. Replica la navegación real
// del backoffice (que estaba hardcoded en
// `apps/backoffice/src/features/sections/section-tree.ts`).
//
// También otorga GRANT al rol `admin` (creado por `seed-iam.ts`) sobre todas
// las secciones, para que el sidebar dinámico funcione desde el primer login.

interface SeedNode {
  code: string;
  name: string;
  icon?: string;
  route?: string;
  order: number;
  children?: SeedNode[];
}

const BACKOFFICE_TREE: SeedNode[] = [
  {
    code: 'dashboard',
    name: 'Dashboard',
    icon: 'LayoutDashboard',
    route: '/dashboard',
    order: 0,
  },
  {
    code: 'iam',
    name: 'IAM',
    icon: 'Shield',
    order: 1,
    children: [
      {
        code: 'iam.users',
        name: 'Usuarios',
        icon: 'Users',
        route: '/users',
        order: 0,
      },
      {
        code: 'iam.roles',
        name: 'Roles',
        icon: 'Shield',
        route: '/roles',
        order: 1,
      },
    ],
  },
  {
    code: 'sections',
    name: 'Secciones',
    icon: 'SquareStack',
    route: '/sections',
    order: 2,
  },
  {
    code: 'blog',
    name: 'Blog',
    icon: 'Newspaper',
    order: 3,
    children: [
      {
        code: 'blog.posts',
        name: 'Posts',
        icon: 'Newspaper',
        route: '/blog/posts',
        order: 0,
      },
      {
        code: 'blog.categories',
        name: 'Categorías',
        icon: 'SquareStack',
        route: '/blog/categories',
        order: 1,
      },
      {
        code: 'blog.tags',
        name: 'Etiquetas',
        icon: 'LayoutList',
        route: '/blog/tags',
        order: 2,
      },
    ],
  },
  {
    code: 'files',
    name: 'Archivos',
    icon: 'Files',
    route: '/files',
    order: 4,
  },
];

const ADMIN_ROLE_CODE = 'admin';
const SCOPE = 'BACKOFFICE' as const;

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  const prisma = app.get(PrismaService);

  console.log(`→ Sembrando árbol de secciones (${SCOPE})...`);
  const idByCode = new Map<string, string>();

  async function upsertNode(node: SeedNode, parentCode: string | null) {
    const existing = await prisma.section.findUnique({
      where: { code_scope: { code: node.code, scope: SCOPE } },
    });
    const parentId = parentCode ? idByCode.get(parentCode) ?? null : null;
    const row = existing
      ? await prisma.section.update({
          where: { id: existing.id },
          data: {
            name: node.name,
            icon: node.icon ?? null,
            route: node.route ?? null,
            parentId,
            order: node.order,
            isActive: true,
          },
        })
      : await prisma.section.create({
          data: {
            id: randomUUID(),
            code: node.code,
            name: node.name,
            icon: node.icon ?? null,
            route: node.route ?? null,
            parentId,
            scope: SCOPE,
            order: node.order,
            isActive: true,
          },
        });
    idByCode.set(node.code, row.id);
    console.log(`  ${existing ? '·' : '+'} ${node.code}`);
    for (const child of node.children ?? []) await upsertNode(child, node.code);
  }

  for (const root of BACKOFFICE_TREE) await upsertNode(root, null);

  console.log(`→ Otorgando GRANT al rol "${ADMIN_ROLE_CODE}"...`);
  const adminRole = await prisma.userRole.findUnique({
    where: { code: ADMIN_ROLE_CODE },
  });
  if (!adminRole) {
    console.warn(
      `  ⚠ Rol "${ADMIN_ROLE_CODE}" no existe. Lanza primero \`pnpm seed\`.`,
    );
  } else {
    for (const sectionId of idByCode.values()) {
      await prisma.roleSectionAccess.upsert({
        where: {
          userRoleId_sectionId: {
            userRoleId: adminRole.id,
            sectionId,
          },
        },
        create: {
          userRoleId: adminRole.id,
          sectionId,
          access: 'GRANT',
        },
        update: { access: 'GRANT' },
      });
    }
    console.log(`  ✓ ${idByCode.size} GRANT(s) sobre admin`);
  }

  console.log('');
  console.log('✓ Seed de secciones completado.');
  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
