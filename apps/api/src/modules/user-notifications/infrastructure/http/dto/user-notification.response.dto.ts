import { ApiProperty } from '@nestjs/swagger';
import { type UserNotification } from '../../../domain/entities/user-notification.entity';

export class UserNotificationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ description: "Categoría, p.ej. 'system' | 'workflow'." })
  kind: string;
  @ApiProperty() title: string;
  @ApiProperty({ type: String, nullable: true }) body: string | null;
  @ApiProperty({
    type: Object,
    nullable: true,
    description: 'Payload libre (deep-link / metadatos de render).',
  })
  data: unknown;
  @ApiProperty({
    type: Date,
    nullable: true,
    description: 'Fecha de lectura. `null` ⇒ no leída.',
  })
  readAt: Date | null;
  @ApiProperty() createdAt: Date;

  static fromDomain(n: UserNotification): UserNotificationResponseDto {
    const dto = new UserNotificationResponseDto();
    dto.id = n.id;
    dto.kind = n.kind;
    dto.title = n.title;
    dto.body = n.body;
    dto.data = n.data ?? null;
    dto.readAt = n.readAt;
    dto.createdAt = n.createdAt;
    return dto;
  }
}
