import type { ReportTarget } from './types';

export function getReportTitle(target: ReportTarget): string {
  if (target.kind === 'comment') {
    return '¿Qué pasa con esta respuesta?';
  }
  return '¿Qué pasa con esta publicación?';
}
