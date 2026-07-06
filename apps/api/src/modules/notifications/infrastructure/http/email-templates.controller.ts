import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BASE_EMAIL_TEMPLATES } from '../../domain/template/base-templates';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { EmailTemplateResponseDto } from './dto/email-template.response.dto';

// Librería de plantillas base de email (solo lectura). El backoffice las lista
// para ofrecer un punto de partida al crear un tipo de mensaje de email.
@ApiTags('notifications')
@Controller('email-templates')
export class EmailTemplatesController {
  @Get()
  @RequiresPermission('notifications', 'READ')
  @ApiOperation({ summary: 'Listar plantillas base de email reutilizables' })
  @ApiOkResponse({ type: EmailTemplateResponseDto, isArray: true })
  list(): EmailTemplateResponseDto[] {
    return BASE_EMAIL_TEMPLATES.map((t) =>
      EmailTemplateResponseDto.fromDomain(t),
    );
  }
}
