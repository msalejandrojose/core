import { Controller, Get, Query, UnauthorizedException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { GetSectionTreeUseCase } from '../../application/use-cases/get-section-tree.use-case';
import { SectionTreeNodeDto } from './dto/section-tree-node.dto';
import { TreeQueryDto } from './dto/tree-query.dto';

@ApiTags('sections')
@Controller('sections')
export class SectionsController {
  constructor(private readonly getSectionTree: GetSectionTreeUseCase) {}

  @Get('tree')
  @ApiOperation({
    summary:
      'Devuelve el árbol de secciones visibles para el usuario, filtrado por permisos.',
  })
  @ApiOkResponse({ type: [SectionTreeNodeDto] })
  async tree(
    @Query() query: TreeQueryDto,
    @CurrentUser() user?: AccessTokenPayload,
  ): Promise<SectionTreeNodeDto[]> {
    if (!user) throw new UnauthorizedException();
    const nodes = await this.getSectionTree.execute({
      scope: query.scope ?? 'BACKOFFICE',
      userId: user.sub,
    });
    return nodes.map((n) => SectionTreeNodeDto.fromDomain(n));
  }
}
