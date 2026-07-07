import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { FieldOptionsRegistry } from '../../application/services/field-options-registry.service';
import { FieldOptionNotFoundError } from '../../domain/errors/field-option-not-found.error';
import { FieldOptionsQueryDto } from './dto/field-options.query.dto';
import {
  FieldOptionDto,
  FieldOptionsEntitiesDto,
  FieldOptionsResultDto,
} from './dto/field-options.response.dto';

/**
 * Endpoint genérico que alimenta los selectores con fuente por repositorio
 * (`source.repository`) de `@core/forms`. Un `entity` = un repositorio
 * registrado (Role, Country…). Protegido con el permiso READ de "forms".
 */
@ApiTags('dynamic-forms')
@Controller('forms/repository')
export class FieldOptionsController {
  constructor(private readonly registry: FieldOptionsRegistry) {}

  @Get()
  @RequiresPermission('forms', 'READ')
  @ApiOperation({ summary: 'Listar las entidades con repositorio de opciones' })
  @ApiOkResponse({ type: FieldOptionsEntitiesDto })
  listEntities(): FieldOptionsEntitiesDto {
    return { entities: this.registry.entities() };
  }

  @Get(':entity')
  @RequiresPermission('forms', 'READ')
  @ApiOperation({ summary: 'Opciones de una entidad (búsqueda + paginación)' })
  @ApiOkResponse({ type: FieldOptionsResultDto })
  async list(
    @Param('entity') entity: string,
    @Query() query: FieldOptionsQueryDto,
  ): Promise<FieldOptionsResultDto> {
    const result = await this.registry.get(entity).list({
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
    });
    return FieldOptionsResultDto.from(result);
  }

  @Get(':entity/:value')
  @RequiresPermission('forms', 'READ')
  @ApiOperation({ summary: 'Resolver una opción concreta por su value' })
  @ApiOkResponse({ type: FieldOptionDto })
  async getOne(
    @Param('entity') entity: string,
    @Param('value') value: string,
  ): Promise<FieldOptionDto> {
    const option = await this.registry.get(entity).getByValue(value);
    if (!option) throw new FieldOptionNotFoundError(entity, value);
    return FieldOptionDto.from(option);
  }
}
