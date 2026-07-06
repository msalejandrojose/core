import { ApiProperty } from '@nestjs/swagger';
import type { BaseEmailTemplate } from '../../../domain/template/base-templates';

export class EmailTemplateResponseDto {
  @ApiProperty({ example: 'transaccional' })
  id: string;

  @ApiProperty({ example: 'Transaccional' })
  name: string;

  @ApiProperty({
    example: 'Aviso transaccional con cabecera, cuerpo y un botón de acción.',
  })
  description: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description:
      'Estructura de la plantilla (theme opcional + lista de bloques). Copiable a content.template.',
  })
  template: Record<string, unknown>;

  static fromDomain(t: BaseEmailTemplate): EmailTemplateResponseDto {
    const dto = new EmailTemplateResponseDto();
    dto.id = t.id;
    dto.name = t.name;
    dto.description = t.description;
    dto.template = t.template as unknown as Record<string, unknown>;
    return dto;
  }
}
