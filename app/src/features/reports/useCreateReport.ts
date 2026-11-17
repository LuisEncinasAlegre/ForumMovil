import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { createReport } from './api';
import type { ReportReason, ReportResult, ReportTarget } from './types';

type CreateReportInput = {
  target: ReportTarget;
  reason: ReportReason;
};

// Ninguna pantalla lee reportes, pero el décimo reporte oculta la publicación o la respuesta
// (trigger check_report): recargamos el foro y los hilos para que deje de verse.
export function useCreateReport(): UseMutationResult<ReportResult, Error, CreateReportInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ target, reason }: CreateReportInput) => createReport(target, reason),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['posts'] }),
        queryClient.invalidateQueries({ queryKey: ['comments'] }),
      ]),
  });
}
