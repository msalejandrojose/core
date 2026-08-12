import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';

// Vacía todas las tablas de negocio entre tests (TRUNCATE, no DROP: las
// migraciones ya corrieron una vez en `pretest:e2e`). Con FK checks
// desactivados durante el barrido para no tener que respetar el orden de
// dependencias. `_prisma_migrations` se excluye a propósito.
//
// Todo corre dentro de `$transaction` (interactiva): con el driver adapter
// cada `$executeRawUnsafe` suelto puede tomar una conexión distinta del pool,
// así que un `SET FOREIGN_KEY_CHECKS=0` fuera de transacción no se respeta en
// el `TRUNCATE` siguiente. La transacción fija una única conexión para todo.
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRawUnsafe<Array<{ TABLE_NAME: string }>>(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME != '_prisma_migrations'`,
  );

  if (tables.length === 0) return;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    for (const { TABLE_NAME } of tables) {
      await tx.$executeRawUnsafe(`TRUNCATE TABLE \`${TABLE_NAME}\``);
    }
    await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
  });
}
