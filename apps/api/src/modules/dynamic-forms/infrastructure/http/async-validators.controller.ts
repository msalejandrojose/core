import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { AsyncValidatorRegistry } from '../../application/services/async-validator-registry.service';
import {
  AsyncValidateDto,
  AsyncValidateResultDto,
} from './dto/async-validate.dto';

/**
 * Resuelve las validaciones `{ kind: 'async', ref }` de `@core/forms` mientras
 * el usuario rellena el formulario (p. ej. disponibilidad de email). La
 * validación autoritativa sigue siendo la del submit; esto es UX en vivo.
 *
 * Protegido con `forms:READ`: algunos validadores (email-available) son un
 * vector de enumeración de usuarios, así que no se exponen sin autenticar.
 */
@ApiTags('dynamic-forms')
@Controller('forms/validate')
export class AsyncValidatorsController {
  constructor(private readonly registry: AsyncValidatorRegistry) {}

  @Post(':ref')
  @HttpCode(HttpStatus.OK)
  @RequiresPermission('forms', 'READ')
  @ApiOperation({ summary: 'Ejecutar un validador asíncrono por su ref' })
  @ApiOkResponse({ type: AsyncValidateResultDto })
  async validate(
    @Param('ref') ref: string,
    @Body() body: AsyncValidateDto,
  ): Promise<AsyncValidateResultDto> {
    const result = await this.registry
      .get(ref)
      .validate(body.value, body.context);
    return AsyncValidateResultDto.from(result);
  }
}
