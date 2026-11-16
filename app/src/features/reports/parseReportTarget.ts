import type { ReportTarget } from './types';

type ReportParams = {
  postId?: string;
  commentId?: string;
};

// Solo enteros positivos escritos tal cual ("7", no "7.0" ni "-3").
function parseId(value: string | undefined): number | null {
  if (value === undefined || !/^[1-9][0-9]*$/.test(value)) {
    return null;
  }
  return Number(value);
}

// Los parámetros de la ruta pueden venir de un enlace, así que no confiamos en ellos.
// Tiene que venir exactamente uno de los dos.
export function parseReportTarget(params: ReportParams): ReportTarget | null {
  const postId = parseId(params.postId);
  const commentId = parseId(params.commentId);
  if (postId !== null && params.commentId === undefined) {
    return { kind: 'post', postId };
  }
  if (commentId !== null && params.postId === undefined) {
    return { kind: 'comment', commentId };
  }
  return null;
}
