import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global → cualquier módulo de feature puede inyectar PrismaService
// sin tener que importar PrismaModule en cada uno.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
