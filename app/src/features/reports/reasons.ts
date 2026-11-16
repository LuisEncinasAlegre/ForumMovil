import type { ReportReason } from './types';

type ReasonOptionData = {
  value: ReportReason;
  label: string;
};

// En el orden del diseño (screens/reportar.elyx).
export const REPORT_REASONS: ReasonOptionData[] = [
  { value: 'spam', label: 'Spam o publicidad' },
  { value: 'acoso', label: 'Acoso o ataque a una persona' },
  { value: 'inapropiado', label: 'Contenido inapropiado' },
  { value: 'otro', label: 'Otro motivo' },
];
