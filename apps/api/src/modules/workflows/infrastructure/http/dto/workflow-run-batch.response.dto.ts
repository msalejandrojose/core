import { ApiProperty } from '@nestjs/swagger';
import { WorkflowRun } from '../../../domain/entities/workflow-run.entity';
import { WorkflowRunResponseDto } from './workflow-run.response.dto';

// Resultado de un disparo con fan-out: cuántos runs se crearon y cuáles.
export class WorkflowRunBatchResponseDto {
  @ApiProperty({ description: 'Número de runs creados (uno por entidad).' })
  triggered: number;

  @ApiProperty({ type: [WorkflowRunResponseDto] })
  runs: WorkflowRunResponseDto[];

  static fromDomain(runs: WorkflowRun[]): WorkflowRunBatchResponseDto {
    const dto = new WorkflowRunBatchResponseDto();
    dto.triggered = runs.length;
    dto.runs = runs.map((r) => WorkflowRunResponseDto.fromDomain(r));
    return dto;
  }
}
