import type { ModerationNotice, NoticeCategory } from './types';

export function noticeTitle(notice: ModerationNotice): string {
  return notice.comment_id !== null ? 'Ocultamos tu respuesta' : 'Ocultamos tu publicación';
}

const CATEGORY_LABELS: Record<NoticeCategory, string> = {
  spam: 'Spam',
  acoso: 'Acoso',
  inapropiado: 'Contenido inapropiado',
  otro: 'Otro',
};

export function categoryLabel(category: NoticeCategory): string {
  return CATEGORY_LABELS[category];
}

// Sin número si fue el ocultado automático por reportes: todavía no cuenta.
export function warningLine(notice: ModerationNotice, warningCount: number | null): string | null {
  if (!notice.counts_as_warning || warningCount === null || warningCount === 0) {
    return null;
  }
  if (warningCount === 1) {
    return 'Es tu primera advertencia.';
  }
  return `Llevas ${warningCount} advertencias.`;
}
