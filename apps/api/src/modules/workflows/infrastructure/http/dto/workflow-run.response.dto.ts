import { ApiProperty } from '@nestjs/swagger';
import { PendingAction } from '../../../domain/entities/pending-action.entity';
import { WorkflowRun } from '../../../domain/entities/workflow-run.entity';
import { WorkflowStepExecution } from '../../../domain/entities/workflow-step-execution.entity';
import { WorkflowRunDetail } from '../../../application/use-cases/get-workflow-run.use-case';

export class WorkflowRunResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() definitionId: string;
  @ApiProperty({ nullable: true }) triggerEventId: string | null;
  @ApiProperty() status: string;
  @ApiProperty({ type: 'object', additionalProperties: true })
  context: Record<string, unknown>;
  @ApiProperty({ nullable: true }) currentStepKey: string | null;
  @ApiProperty() isDryRun: boolean;
  @ApiProperty() startedAt: Date;
  @ApiProperty({ nullable: true }) finishedAt: Date | null;
  @ApiProperty({ nullable: true }) lastError: string | null;

  static fromDomain(run: WorkflowRun): WorkflowRunResponseDto {
    const dto = new WorkflowRunResponseDto();
    dto.id = run.id;
    dto.definitionId = run.definitionId;
    dto.triggerEventId = run.triggerEventId;
    dto.status = run.status;
    dto.context = run.context;
    dto.currentStepKey = run.currentStepKey;
    dto.isDryRun = run.isDryRun;
    dto.startedAt = run.startedAt;
    dto.finishedAt = run.finishedAt;
    dto.lastError = run.lastError;
    return dto;
  }
}

export class WorkflowStepExecutionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() stepKey: string;
  @ApiProperty() actionKey: string;
  @ApiProperty() status: string;
  @ApiProperty() attempt: number;
  @ApiProperty({ nullable: true, type: 'object', additionalProperties: true })
  input: unknown;
  @ApiProperty({ nullable: true, type: 'object', additionalProperties: true })
  output: unknown;
  @ApiProperty({ nullable: true }) error: string | null;
  @ApiProperty() startedAt: Date;
  @ApiProperty({ nullable: true }) finishedAt: Date | null;

  static fromDomain(
    step: WorkflowStepExecution,
  ): WorkflowStepExecutionResponseDto {
    const dto = new WorkflowStepExecutionResponseDto();
    dto.id = step.id;
    dto.stepKey = step.stepKey;
    dto.actionKey = step.actionKey;
    dto.status = step.status;
    dto.attempt = step.attempt;
    dto.input = step.input;
    dto.output = step.output;
    dto.error = step.error;
    dto.startedAt = step.startedAt;
    dto.finishedAt = step.finishedAt;
    return dto;
  }
}

export class PendingActionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ nullable: true }) stepKey: string | null;
  @ApiProperty() kind: string;
  @ApiProperty() status: string;
  @ApiProperty({ nullable: true }) runAt: Date | null;
  @ApiProperty({ nullable: true }) eventType: string | null;
  @ApiProperty() createdAt: Date;

  static fromDomain(pa: PendingAction): PendingActionResponseDto {
    const dto = new PendingActionResponseDto();
    dto.id = pa.id;
    dto.stepKey = pa.stepKey;
    dto.kind = pa.kind;
    dto.status = pa.status;
    dto.runAt = pa.runAt;
    dto.eventType = pa.eventType;
    dto.createdAt = pa.createdAt;
    return dto;
  }
}

export class WorkflowRunDetailResponseDto {
  @ApiProperty({ type: WorkflowRunResponseDto }) run: WorkflowRunResponseDto;
  @ApiProperty({ type: [WorkflowStepExecutionResponseDto] })
  steps: WorkflowStepExecutionResponseDto[];
  @ApiProperty({ type: [PendingActionResponseDto] })
  pendingActions: PendingActionResponseDto[];

  static fromDomain(detail: WorkflowRunDetail): WorkflowRunDetailResponseDto {
    const dto = new WorkflowRunDetailResponseDto();
    dto.run = WorkflowRunResponseDto.fromDomain(detail.run);
    dto.steps = detail.steps.map((s) =>
      WorkflowStepExecutionResponseDto.fromDomain(s),
    );
    dto.pendingActions = detail.pendingActions.map((p) =>
      PendingActionResponseDto.fromDomain(p),
    );
    return dto;
  }
}
