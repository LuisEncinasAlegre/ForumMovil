// Los cuatro motivos que acepta la base de datos (check de reports.reason).
export type ReportReason = 'spam' | 'acoso' | 'inapropiado' | 'otro';

// Un reporte apunta a una publicación o a una respuesta, nunca a las dos.
export type ReportTarget = { kind: 'post'; postId: number } | { kind: 'comment'; commentId: number };

// "ya reportado" no es un error: la persona ya hizo lo que quería.
export type ReportResult = 'sent' | 'alreadyReported';
