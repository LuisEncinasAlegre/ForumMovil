import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { createReport } from './api';
import type { ReportReason, ReportResult, ReportTarget } from './types';

type CreateReportInput = {
  target: ReportTarget;
  reason: ReportReason;
};

// No invalida nada: ninguna pantalla lee reportes y reportar no cambia el foro.
export function useCreateReport(): UseMutationResult<ReportResult, Error, CreateReportInput> {
  return useMutation({
    mutationFn: ({ target, reason }: CreateReportInput) => createReport(target, reason),
  });
}
