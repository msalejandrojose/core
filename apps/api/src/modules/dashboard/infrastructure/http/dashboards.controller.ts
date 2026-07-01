import {
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import {
  CannotDeleteLastDashboardError,
  DashboardForbiddenError,
  DashboardNotFoundError,
} from '../../domain/errors/dashboard.errors';
import { DASHBOARD_TEMPLATES } from '../../application/dashboard-templates';
import { AddWidgetUseCase } from '../../application/use-cases/add-widget.use-case';
import { CreateDashboardUseCase } from '../../application/use-cases/create-dashboard.use-case';
import { DeleteDashboardUseCase } from '../../application/use-cases/delete-dashboard.use-case';
import { DuplicateDashboardUseCase } from '../../application/use-cases/duplicate-dashboard.use-case';
import { GetDashboardUseCase } from '../../application/use-cases/get-dashboard.use-case';
import { ListDashboardsUseCase } from '../../application/use-cases/list-dashboards.use-case';
import { RemoveWidgetUseCase } from '../../application/use-cases/remove-widget.use-case';
import { SaveLayoutUseCase } from '../../application/use-cases/save-layout.use-case';
import { UpdateDashboardUseCase } from '../../application/use-cases/update-dashboard.use-case';
import {
  AddWidgetDto,
  CreateDashboardDto,
  DashboardDto,
  DashboardListDto,
  DashboardWidgetDto,
  SaveLayoutDto,
  UpdateDashboardDto,
} from './dto/dashboard.dto';

@ApiTags('dashboards')
@Auth()
@Controller('dashboards')
export class DashboardsController {
  constructor(
    private readonly listDashboards: ListDashboardsUseCase,
    private readonly getDashboard: GetDashboardUseCase,
    private readonly createDashboard: CreateDashboardUseCase,
    private readonly updateDashboard: UpdateDashboardUseCase,
    private readonly deleteDashboard: DeleteDashboardUseCase,
    private readonly duplicateDashboard: DuplicateDashboardUseCase,
    private readonly saveLayout: SaveLayoutUseCase,
    private readonly addWidget: AddWidgetUseCase,
    private readonly removeWidget: RemoveWidgetUseCase,
  ) {}

  // ─── Templates ──────────────────────────────────────────────────────────────

  @Get('templates')
  @ApiOperation({ summary: 'Lista plantillas de dashboard predefinidas.' })
  getTemplates() {
    return {
      templates: DASHBOARD_TEMPLATES.map(({ id, name, description }) => ({ id, name, description })),
    };
  }

  @Post('from-template/:templateId')
  @ApiOperation({ summary: 'Crea un dashboard a partir de una plantilla.' })
  @ApiCreatedResponse({ type: DashboardDto })
  async createFromTemplate(
    @Param('templateId') templateId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<DashboardDto> {
    const template = DASHBOARD_TEMPLATES.find((t) => t.id === templateId);
    if (!template) throw new NotFoundException(`Template '${templateId}' not found`);

    const dashboard = await this.createDashboard.execute({
      userId: user.sub,
      name: template.name,
    });

    const withLayout = await this.saveLayout.execute(
      dashboard.id,
      user.sub,
      template.widgets.map((w, i) => ({ ...w, id: `tpl-${i}` })),
    );

    return DashboardDto.from(withLayout);
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Lista los dashboards del usuario autenticado.' })
  @ApiOkResponse({ type: DashboardListDto })
  async list(@CurrentUser() user: AccessTokenPayload): Promise<DashboardListDto> {
    const dashboards = await this.listDashboards.execute(user.sub);
    return { dashboards: dashboards.map(DashboardDto.from) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un dashboard con sus widgets.' })
  @ApiOkResponse({ type: DashboardDto })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<DashboardDto> {
    try {
      return DashboardDto.from(await this.getDashboard.execute(id, user.sub));
    } catch (e) {
      if (e instanceof DashboardNotFoundError) throw new NotFoundException(e.message);
      if (e instanceof DashboardForbiddenError) throw new ForbiddenException(e.message);
      throw e;
    }
  }

  @Post()
  @ApiOperation({ summary: 'Crea un nuevo dashboard.' })
  @ApiCreatedResponse({ type: DashboardDto })
  async create(
    @Body() dto: CreateDashboardDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<DashboardDto> {
    return DashboardDto.from(
      await this.createDashboard.execute({
        userId: user.sub,
        name: dto.name,
        makeDefault: dto.makeDefault,
      }),
    );
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplica un dashboard existente.' })
  @ApiCreatedResponse({ type: DashboardDto })
  async duplicate(
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<DashboardDto> {
    try {
      return DashboardDto.from(await this.duplicateDashboard.execute(id, user.sub));
    } catch (e) {
      if (e instanceof DashboardNotFoundError) throw new NotFoundException(e.message);
      if (e instanceof DashboardForbiddenError) throw new ForbiddenException(e.message);
      throw e;
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Renombra o convierte en default un dashboard.' })
  @ApiOkResponse({ type: DashboardDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDashboardDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<DashboardDto> {
    try {
      return DashboardDto.from(
        await this.updateDashboard.execute({
          id,
          userId: user.sub,
          name: dto.name,
          makeDefault: dto.makeDefault,
        }),
      );
    } catch (e) {
      if (e instanceof DashboardNotFoundError) throw new NotFoundException(e.message);
      if (e instanceof DashboardForbiddenError) throw new ForbiddenException(e.message);
      throw e;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina un dashboard (no el último).' })
  @ApiNoContentResponse()
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<void> {
    try {
      await this.deleteDashboard.execute(id, user.sub);
    } catch (e) {
      if (e instanceof DashboardNotFoundError) throw new NotFoundException(e.message);
      if (e instanceof DashboardForbiddenError) throw new ForbiddenException(e.message);
      if (e instanceof CannotDeleteLastDashboardError) throw new ConflictException(e.message);
      throw e;
    }
  }

  @Put(':id/layout')
  @ApiOperation({ summary: 'Reemplaza el layout completo de un dashboard.' })
  @ApiOkResponse({ type: DashboardDto })
  async saveLayoutEndpoint(
    @Param('id') id: string,
    @Body() dto: SaveLayoutDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<DashboardDto> {
    try {
      return DashboardDto.from(await this.saveLayout.execute(id, user.sub, dto.widgets));
    } catch (e) {
      if (e instanceof DashboardNotFoundError) throw new NotFoundException(e.message);
      if (e instanceof DashboardForbiddenError) throw new ForbiddenException(e.message);
      throw e;
    }
  }

  @Post(':id/widgets')
  @ApiOperation({ summary: 'Añade un widget al dashboard.' })
  @ApiCreatedResponse({ type: DashboardWidgetDto })
  async addWidgetEndpoint(
    @Param('id') id: string,
    @Body() dto: AddWidgetDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<DashboardWidgetDto> {
    try {
      return DashboardWidgetDto.from(
        await this.addWidget.execute({
          dashboardId: id,
          userId: user.sub,
          kpiSlug: dto.kpiSlug,
          widgetType: dto.widgetType,
          x: dto.x,
          y: dto.y,
          w: dto.w,
          h: dto.h,
          config: dto.config,
        }),
      );
    } catch (e) {
      if (e instanceof DashboardNotFoundError) throw new NotFoundException(e.message);
      if (e instanceof DashboardForbiddenError) throw new ForbiddenException(e.message);
      throw e;
    }
  }

  @Delete(':id/widgets/:widgetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina un widget del dashboard.' })
  @ApiNoContentResponse()
  async removeWidgetEndpoint(
    @Param('id') id: string,
    @Param('widgetId') widgetId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<void> {
    try {
      await this.removeWidget.execute(id, widgetId, user.sub);
    } catch (e) {
      if (e instanceof DashboardNotFoundError) throw new NotFoundException(e.message);
      if (e instanceof DashboardForbiddenError) throw new ForbiddenException(e.message);
      throw e;
    }
  }
}
