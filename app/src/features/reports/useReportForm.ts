import * as Haptics from 'expo-haptics';
import { useState } from 'react';

import { getReportErrorMessage } from './reportErrorMessage';
import type { ReportReason, ReportResult, ReportTarget } from './types';
import { useCreateReport } from './useCreateReport';

export type ReportForm = {
  selectedReason: ReportReason | null;
  selectReason: (reason: ReportReason) => void;
  canSend: boolean;
  isSending: boolean;
  // null mientras no se ha enviado
  result: ReportResult | null;
  errorMessage: string | null;
  send: () => Promise<void>;
};

// Lógica de la hoja Reportar: un motivo obligatorio y un envío.
export function useReportForm(target: ReportTarget): ReportForm {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const createReport = useCreateReport();

  const isSending = createReport.isPending;
  const canSend = selectedReason !== null && !isSending;

  async function send(): Promise<void> {
    if (selectedReason === null || isSending) {
      return;
    }
    try {
      await createReport.mutateAsync({ target, reason: selectedReason });
      // la vibración es un extra: si el teléfono no la soporta, igual se envió
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      // el error queda en la mutación y la hoja lo muestra en errorMessage; el motivo no se pierde
    }
  }

  return {
    selectedReason,
    selectReason: setSelectedReason,
    canSend,
    isSending,
    result: createReport.data ?? null,
    errorMessage: createReport.error ? getReportErrorMessage(createReport.error) : null,
    send,
  };
}
