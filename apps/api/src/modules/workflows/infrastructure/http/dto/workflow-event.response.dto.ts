import { ApiProperty } from '@nestjs/swagger';
import { WorkflowEvent } from '../../../domain/entities/event.entity';

export class WorkflowEventResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() type: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) payload: unknown;
  @ApiProperty({ nullable: true }) sourceUserId: string | null;
  @ApiProperty({ nullable: true }) correlationId: string | null;
  @ApiProperty({ nullable: true }) idempotencyKey: string | null;
  @ApiProperty() occurredAt: Date;

  static fromDomain(event: WorkflowEvent): WorkflowEventResponseDto {
    const dto = new WorkflowEventResponseDto();
    dto.id = event.id;
    dto.type = event.type;
    dto.payload = event.payload;
    dto.sourceUserId = event.sourceUserId;
    dto.correlationId = event.correlationId;
    dto.idempotencyKey = event.idempotencyKey;
    dto.occurredAt = event.occurredAt;
    return dto;
  }
}
