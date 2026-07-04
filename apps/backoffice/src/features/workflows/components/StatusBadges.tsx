import { Badge } from '@/components/ui/badge';
import {
  RUN_STATUS_LABELS,
  RUN_STATUS_VARIANT,
  STEP_STATUS_LABELS,
  STEP_STATUS_VARIANT,
  type WorkflowRunStatus,
  type WorkflowStepStatus,
} from '../types';

export function RunStatusBadge({ status }: { status: WorkflowRunStatus }) {
  return (
    <Badge variant={RUN_STATUS_VARIANT[status] ?? 'outline'}>
      {RUN_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function StepStatusBadge({ status }: { status: WorkflowStepStatus }) {
  return (
    <Badge variant={STEP_STATUS_VARIANT[status] ?? 'outline'}>
      {STEP_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
