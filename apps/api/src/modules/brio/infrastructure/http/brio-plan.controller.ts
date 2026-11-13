import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import type { Plan, PlannedSession } from '../../domain/entities/plan.entity';
import { PLAN_TEMPLATES, type PlanTemplate } from '../../domain/services/plan';
import {
  ArchivePlanUseCase,
  ClearPlannedDayUseCase,
  CompletePlannedDayUseCase,
  FillPlanWeekUseCase,
  GetPlanWeekUseCase,
  SavePlanUseCase,
  SetPlannedDayUseCase,
  fromTemplate,
  type PlanWeek,
} from '../../application/use-cases/plan.use-cases';
import type { PlannedSessionData } from '../../application/ports/brio-plan-repository.port';
import { DAY_PATTERN } from './dto/day.param';
import {
  CompleteDayDto,
  FillWeekDto,
  SavePlanDto,
  SetPlannedDayDto,
} from './dto/plan.dto';
import { DayQueryDto } from './dto/queries.dto';

function assertDay(day: string): string {
  if (!DAY_PATTERN.test(day) || Number.isNaN(Date.parse(day))) {
    throw new BadRequestException('El día debe tener formato YYYY-MM-DD.');
  }
  return day;
}

// Plan de entrenamiento: el objetivo, la semana planificada y el check de lo
// hecho. Todo va scopeado a `current.sub`.
@ApiTags('brio')
@Auth()
@Controller('brio/plan')
export class BrioPlanController {
  constructor(
    private readonly getWeek: GetPlanWeekUseCase,
    private readonly savePlan: SavePlanUseCase,
    private readonly archivePlan: ArchivePlanUseCase,
    private readonly setDay: SetPlannedDayUseCase,
    private readonly clearDay: ClearPlannedDayUseCase,
    private readonly completeDay: CompletePlannedDayUseCase,
    private readonly fillWeek: FillPlanWeekUseCase,
  ) {}

  @Get('week')
  @ApiOperation({
    summary:
      'Mi semana: sesiones planificadas, lo hecho, mi objetivo y la dieta por carga.',
  })
  @ApiOkResponse({
    description:
      'Siete días (lunes a domingo) con su estado, el plan activo y las kcal de cada día.',
  })
  week(
    @CurrentUser() current: AccessTokenPayload,
    @Query() query: DayQueryDto,
  ): Promise<PlanWeek> {
    return this.getWeek.execute(current.sub, query.day ?? null);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Sesiones tipo para montar la semana.' })
  @ApiOkResponse({ description: 'Plantillas de sesión.' })
  templates(): readonly PlanTemplate[] {
    return PLAN_TEMPLATES;
  }

  @Put()
  @ApiOperation({
    summary: 'Crear o cambiar mi objetivo (carrera, fecha, tiempo).',
  })
  @ApiOkResponse({ description: 'Plan activo.' })
  save(
    @CurrentUser() current: AccessTokenPayload,
    @Body() body: SavePlanDto,
  ): Promise<Plan> {
    return this.savePlan.execute(current.sub, {
      name: body.name.trim(),
      raceDate: body.raceDate ?? null,
      raceDistanceM: body.raceDistanceM ?? null,
      targetTimeSec: body.targetTimeSec ?? null,
      notes: body.notes?.trim() || null,
    });
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Archivar mi objetivo. Las sesiones planificadas se conservan.',
  })
  @ApiNoContentResponse()
  async archive(@CurrentUser() current: AccessTokenPayload): Promise<void> {
    await this.archivePlan.execute(current.sub);
  }

  @Put('days/:day')
  @ApiOperation({
    summary:
      'Poner la sesión de un día, desde una plantilla o con campos propios.',
  })
  @ApiOkResponse({ description: 'Sesión planificada.' })
  set(
    @CurrentUser() current: AccessTokenPayload,
    @Param('day') day: string,
    @Body() body: SetPlannedDayDto,
  ): Promise<PlannedSession> {
    const { templateCode, ...fields } = body;
    // Solo los campos que vienen en el cuerpo pisan a la plantilla.
    const changes = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined),
    ) as Partial<PlannedSessionData>;

    let data: PlannedSessionData | null;
    if (templateCode) {
      data = fromTemplate(templateCode, changes);
      if (!data) throw new BadRequestException('Plantilla desconocida.');
    } else {
      if (!body.kind || !body.title || !body.load) {
        throw new BadRequestException(
          'Sin plantilla hacen falta kind, title y load.',
        );
      }
      data = {
        kind: body.kind,
        templateCode: null,
        title: body.title.trim(),
        load: body.load,
        startTime: body.startTime ?? null,
        plannedDurationMin: body.plannedDurationMin ?? null,
        plannedDistanceM: body.plannedDistanceM ?? null,
        targetPaceSecPerKm: body.targetPaceSecPerKm ?? null,
        structure: body.structure ?? null,
        notes: body.notes?.trim() || null,
      };
    }
    return this.setDay.execute(current.sub, assertDay(day), data);
  }

  @Delete('days/:day')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quitar lo planificado de un día.' })
  @ApiNoContentResponse()
  async clear(
    @CurrentUser() current: AccessTokenPayload,
    @Param('day') day: string,
  ): Promise<void> {
    await this.clearDay.execute(current.sub, assertDay(day));
  }

  @Put('days/:day/completion')
  @ApiOperation({
    summary:
      'Check diario: marcar la sesión como hecha (o no) con notas de lo ejecutado.',
  })
  @ApiOkResponse({ description: 'Sesión con su check.' })
  complete(
    @CurrentUser() current: AccessTokenPayload,
    @Param('day') day: string,
    @Body() body: CompleteDayDto,
  ): Promise<PlannedSession> {
    return this.completeDay.execute(current.sub, assertDay(day), body);
  }

  @Post('week/fill')
  @ApiOperation({
    summary: 'Rellenar una semana con la semana tipo o repitiendo la anterior.',
  })
  @ApiOkResponse({ description: 'Cuántos días se han escrito.' })
  async fill(
    @CurrentUser() current: AccessTokenPayload,
    @Body() body: FillWeekDto,
  ): Promise<{ written: number }> {
    return {
      written: await this.fillWeek.execute(
        current.sub,
        body.day,
        body.mode,
        body.replace ?? false,
      ),
    };
  }
}
