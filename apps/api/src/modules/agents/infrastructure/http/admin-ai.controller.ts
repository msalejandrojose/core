import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { AgentsAdminUseCases } from '../../application/use-cases/agents-admin.use-cases';
import {
  AiAgentDto,
  AiModelDto,
  AiRequestDto,
  AiSkillDto,
  AiToolDto,
  SaveAiAgentDto,
  SaveAiSkillDto,
  UpdateAiModelDto,
  UsageQueryDto,
  UsageResponseDto,
} from './dto/agents.dto';

// Backoffice de agentes de IA. Cada bloque va con su sección (permisos).

@ApiTags('ai-admin')
@Controller('admin/ai/models')
export class AdminAiModelsController {
  constructor(private readonly admin: AgentsAdminUseCases) {}

  @Get()
  @RequiresPermission('ai.models', 'READ')
  @ApiOperation({ summary: 'Modelos con su precio por millón de tokens' })
  @ApiOkResponse({ type: [AiModelDto] })
  async list(): Promise<AiModelDto[]> {
    return (await this.admin.listModels()).map((x) => AiModelDto.from(x));
  }

  @Patch(':id')
  @RequiresPermission('ai.models', 'WRITE')
  @ApiOperation({
    summary: 'Cambiar precio, nombre o activar/desactivar un modelo',
  })
  @ApiOkResponse({ type: AiModelDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateAiModelDto,
  ): Promise<AiModelDto> {
    return AiModelDto.from(await this.admin.updateModel(id, body));
  }
}

@ApiTags('ai-admin')
@Controller('admin/ai/skills')
export class AdminAiSkillsController {
  constructor(private readonly admin: AgentsAdminUseCases) {}

  @Get()
  @RequiresPermission('ai.skills', 'READ')
  @ApiOperation({ summary: 'Skills (bloques de instrucciones reutilizables)' })
  @ApiOkResponse({ type: [AiSkillDto] })
  async list(): Promise<AiSkillDto[]> {
    return (await this.admin.listSkills()).map((x) => AiSkillDto.from(x));
  }

  @Post()
  @RequiresPermission('ai.skills', 'WRITE')
  @ApiOkResponse({ type: AiSkillDto })
  async create(@Body() body: SaveAiSkillDto): Promise<AiSkillDto> {
    return AiSkillDto.from(
      await this.admin.createSkill({
        ...body,
        description: body.description ?? null,
      }),
    );
  }

  @Put(':id')
  @RequiresPermission('ai.skills', 'WRITE')
  @ApiOkResponse({ type: AiSkillDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SaveAiSkillDto,
  ): Promise<AiSkillDto> {
    return AiSkillDto.from(
      await this.admin.updateSkill(id, {
        ...body,
        description: body.description ?? null,
      }),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresPermission('ai.skills', 'WRITE')
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.admin.deleteSkill(id);
  }
}

@ApiTags('ai-admin')
@Controller('admin/ai/agents')
export class AdminAiAgentsController {
  constructor(private readonly admin: AgentsAdminUseCases) {}

  @Get()
  @RequiresPermission('ai.agents', 'READ')
  @ApiOperation({ summary: 'Agentes configurados' })
  @ApiOkResponse({ type: [AiAgentDto] })
  async list(): Promise<AiAgentDto[]> {
    return (await this.admin.listAgents()).map((x) => AiAgentDto.from(x));
  }

  @Get('tools')
  @RequiresPermission('ai.agents', 'READ')
  @ApiOperation({ summary: 'Herramientas disponibles para los agentes' })
  @ApiOkResponse({ type: [AiToolDto] })
  tools(): AiToolDto[] {
    return this.admin.listTools();
  }

  @Get(':id')
  @RequiresPermission('ai.agents', 'READ')
  @ApiOkResponse({ type: AiAgentDto })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<AiAgentDto> {
    return AiAgentDto.from(await this.admin.getAgent(id));
  }

  @Post()
  @RequiresPermission('ai.agents', 'WRITE')
  @ApiOkResponse({ type: AiAgentDto })
  async create(@Body() body: SaveAiAgentDto): Promise<AiAgentDto> {
    return AiAgentDto.from(
      await this.admin.createAgent({
        ...body,
        description: body.description ?? null,
      }),
    );
  }

  @Put(':id')
  @RequiresPermission('ai.agents', 'WRITE')
  @ApiOkResponse({ type: AiAgentDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SaveAiAgentDto,
  ): Promise<AiAgentDto> {
    return AiAgentDto.from(
      await this.admin.updateAgent(id, {
        ...body,
        description: body.description ?? null,
      }),
    );
  }
}

@ApiTags('ai-admin')
@Controller('admin/ai/usage')
export class AdminAiUsageController {
  constructor(private readonly admin: AgentsAdminUseCases) {}

  @Get()
  @RequiresPermission('ai.usage', 'READ')
  @ApiOperation({
    summary: 'Peticiones al proveedor con tokens y coste, totales y por agente',
  })
  @ApiOkResponse({ type: UsageResponseDto })
  async usage(@Query() q: UsageQueryDto): Promise<UsageResponseDto> {
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const out = await this.admin.usage(
      {
        agentId: q.agentId,
        from: q.from ? new Date(q.from) : undefined,
        to: q.to ? new Date(q.to) : undefined,
      },
      page,
      limit,
    );
    return {
      data: out.items.map((x) => AiRequestDto.from(x)),
      total: out.total,
      page,
      limit,
      totals: out.totals,
      byAgent: out.byAgent,
    };
  }
}
