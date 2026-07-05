import {
  Body,
  Controller,
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
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiCursorPaginatedResponse,
  CursorPaginatedResponseDto,
} from '../../../../shared/pagination';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { AddLeadNoteUseCase } from '../../application/use-cases/add-lead-note.use-case';
import { AssignLeadUseCase } from '../../application/use-cases/assign-lead.use-case';
import { ChangeLeadStatusUseCase } from '../../application/use-cases/change-lead-status.use-case';
import { ConvertLeadUseCase } from '../../application/use-cases/convert-lead.use-case';
import { CreateLeadUseCase } from '../../application/use-cases/create-lead.use-case';
import { CreateLeadTagUseCase } from '../../application/use-cases/create-lead-tag.use-case';
import { GetLeadUseCase } from '../../application/use-cases/get-lead.use-case';
import { ListLeadActivitiesUseCase } from '../../application/use-cases/list-lead-activities.use-case';
import { ListLeadTagsUseCase } from '../../application/use-cases/list-lead-tags.use-case';
import { ListLeadsUseCase } from '../../application/use-cases/list-leads.use-case';
import { SetLeadTagsUseCase } from '../../application/use-cases/set-lead-tags.use-case';
import { UpdateLeadUseCase } from '../../application/use-cases/update-lead.use-case';
import { AddNoteDto } from './dto/add-note.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateLeadTagDto } from './dto/create-lead-tag.dto';
import { LeadActivityResponseDto } from './dto/lead-activity.response.dto';
import { LeadResponseDto } from './dto/lead.response.dto';
import { LeadTagResponseDto } from './dto/lead-tag.response.dto';
import { ListLeadsQueryDto } from './dto/list-leads.query.dto';
import { SetTagsDto } from './dto/set-tags.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly listLeads: ListLeadsUseCase,
    private readonly getLead: GetLeadUseCase,
    private readonly createLead: CreateLeadUseCase,
    private readonly updateLead: UpdateLeadUseCase,
    private readonly changeStatus: ChangeLeadStatusUseCase,
    private readonly assignLead: AssignLeadUseCase,
    private readonly addNote: AddLeadNoteUseCase,
    private readonly convertLead: ConvertLeadUseCase,
    private readonly setTags: SetLeadTagsUseCase,
    private readonly listActivities: ListLeadActivitiesUseCase,
    private readonly listTags: ListLeadTagsUseCase,
    private readonly createTag: CreateLeadTagUseCase,
  ) {}

  @Get()
  @RequiresPermission('leads', 'READ')
  @ApiOperation({ summary: 'Listar leads' })
  @ApiCursorPaginatedResponse(LeadResponseDto)
  async list(
    @Query() query: ListLeadsQueryDto,
  ): Promise<CursorPaginatedResponseDto<LeadResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listLeads.execute({
      limit,
      cursor: query.cursor,
      status: query.status,
      source: query.source,
      ownerId: query.ownerId,
      tagId: query.tagId,
      q: query.q,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((l) => LeadResponseDto.fromDomain(l)),
      page.nextCursor,
      limit,
    );
  }

  @Post()
  @RequiresPermission('leads', 'WRITE')
  @ApiOperation({ summary: 'Alta manual de un lead' })
  @ApiCreatedResponse({ type: LeadResponseDto })
  async create(
    @Body() dto: CreateLeadDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<LeadResponseDto> {
    const lead = await this.createLead.execute({
      ...dto,
      createdById: user.sub,
    });
    return LeadResponseDto.fromDomain(lead);
  }

  // --- Etiquetas (declaradas antes de `:id` para no colisionar con la ruta) ---

  @Get('tags')
  @RequiresPermission('leads', 'READ')
  @ApiOperation({ summary: 'Listar etiquetas de leads' })
  @ApiOkResponse({ type: [LeadTagResponseDto] })
  async getTags(): Promise<LeadTagResponseDto[]> {
    const tags = await this.listTags.execute();
    return tags.map((t) => LeadTagResponseDto.fromDomain(t));
  }

  @Post('tags')
  @RequiresPermission('leads', 'WRITE')
  @ApiOperation({ summary: 'Crear una etiqueta de leads' })
  @ApiCreatedResponse({ type: LeadTagResponseDto })
  async postTag(@Body() dto: CreateLeadTagDto): Promise<LeadTagResponseDto> {
    const tag = await this.createTag.execute(dto);
    return LeadTagResponseDto.fromDomain(tag);
  }

  // --- Recurso individual ---

  @Get(':id')
  @RequiresPermission('leads', 'READ')
  @ApiOperation({ summary: 'Obtener un lead' })
  @ApiOkResponse({ type: LeadResponseDto })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<LeadResponseDto> {
    return LeadResponseDto.fromDomain(await this.getLead.execute(id));
  }

  @Patch(':id')
  @RequiresPermission('leads', 'WRITE')
  @ApiOperation({ summary: 'Editar datos de contacto / atribución de un lead' })
  @ApiOkResponse({ type: LeadResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
  ): Promise<LeadResponseDto> {
    return LeadResponseDto.fromDomain(await this.updateLead.execute(id, dto));
  }

  @Post(':id/status')
  @RequiresPermission('leads', 'WRITE')
  @ApiOperation({
    summary: 'Cambiar el estado de un lead (transición validada)',
  })
  @ApiOkResponse({ type: LeadResponseDto })
  async status(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<LeadResponseDto> {
    const lead = await this.changeStatus.execute(id, {
      to: dto.to,
      reason: dto.reason ?? null,
      actorId: user.sub,
    });
    return LeadResponseDto.fromDomain(lead);
  }

  @Post(':id/assign')
  @RequiresPermission('leads', 'WRITE')
  @ApiOperation({ summary: 'Asignar responsable a un lead' })
  @ApiOkResponse({ type: LeadResponseDto })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignLeadDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<LeadResponseDto> {
    const lead = await this.assignLead.execute(id, {
      ownerId: dto.ownerId,
      actorId: user.sub,
    });
    return LeadResponseDto.fromDomain(lead);
  }

  @Post(':id/notes')
  @HttpCode(HttpStatus.CREATED)
  @RequiresPermission('leads', 'WRITE')
  @ApiOperation({ summary: 'Añadir una nota al timeline del lead' })
  @ApiCreatedResponse({ type: LeadActivityResponseDto })
  async note(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddNoteDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<LeadActivityResponseDto> {
    const activity = await this.addNote.execute(id, {
      body: dto.body,
      actorId: user.sub,
    });
    return LeadActivityResponseDto.fromDomain(activity);
  }

  @Post(':id/convert')
  @RequiresPermission('leads', 'WRITE')
  @ApiOperation({ summary: 'Convertir un lead (→ WON + vínculo a User)' })
  @ApiOkResponse({ type: LeadResponseDto })
  async convert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertLeadDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<LeadResponseDto> {
    const lead = await this.convertLead.execute(id, {
      userId: dto.userId,
      actorId: user.sub,
    });
    return LeadResponseDto.fromDomain(lead);
  }

  @Put(':id/tags')
  @RequiresPermission('leads', 'WRITE')
  @ApiOperation({ summary: 'Setear las etiquetas de un lead (bulk)' })
  @ApiOkResponse({ type: LeadResponseDto })
  async putTags(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetTagsDto,
  ): Promise<LeadResponseDto> {
    return LeadResponseDto.fromDomain(
      await this.setTags.execute(id, dto.tagIds),
    );
  }

  @Get(':id/activities')
  @RequiresPermission('leads', 'READ')
  @ApiOperation({ summary: 'Listar el timeline de actividades de un lead' })
  @ApiCursorPaginatedResponse(LeadActivityResponseDto)
  async activities(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListLeadsQueryDto,
  ): Promise<CursorPaginatedResponseDto<LeadActivityResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listActivities.execute(id, {
      limit,
      cursor: query.cursor,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((a) => LeadActivityResponseDto.fromDomain(a)),
      page.nextCursor,
      limit,
    );
  }
}
