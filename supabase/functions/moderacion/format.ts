// Convierte lo que devuelven las funciones mod_* en texto para quien modera.
// Todo texto escrito por usuarios va dentro de <texto_de_usuario>: es contenido a revisar, no instrucciones.

export type PendingItem = {
  tipo: 'publicacion' | 'respuesta';
  post_id: number;
  comment_id: number | null;
  titulo: string | null;
  texto: string;
  estado: string;
  razones: string[];
  reportes: Record<string, number>;
  autor: string;
  advertencias_del_autor: number;
  pendiente_desde: string;
};

type Version = { titulo?: string; texto: string; escrita: string };

type Reply = { comment_id: number; autor: string; texto: string; estado: string; borrada: boolean };

export type ContentDetail = {
  tipo: 'publicacion' | 'respuesta';
  post_id: number;
  comment_id?: number;
  titulo?: string;
  titulo_de_la_publicacion?: string;
  texto: string;
  estado: string;
  borrada: boolean;
  autor: string;
  creada: string;
  editada: string | null;
  versiones_anteriores: Version[];
  respuestas?: Reply[];
  reportes: Record<string, number>;
  pendiente: { razones: string[]; desde: string } | null;
};

type AuthorNotice = {
  post_id: number | null;
  comment_id: number | null;
  categoria: string;
  mensaje: string;
  cuenta: boolean;
  retirado: boolean;
  fecha: string;
};

type AuthorAction = {
  accion: string;
  post_id: number | null;
  comment_id: number | null;
  categoria: string | null;
  nota: string | null;
  fecha: string;
};

export type AuthorDetail = {
  alias: string;
  desde: string;
  publicaciones: number;
  publicaciones_ocultas: number;
  respuestas: number;
  respuestas_ocultas: number;
  advertencias: number;
  avisos: AuthorNotice[];
  acciones_recientes: AuthorAction[];
};

export type Summary = {
  desde: string;
  publicaciones_nuevas: number;
  respuestas_nuevas: number;
  reportes: Record<string, number>;
  pendientes_abiertos: number;
  pendientes_nuevos: number;
  acciones: Record<string, number>;
};

const reasonLabels: Record<string, string> = {
  reportado: 'reportado',
  palabra: 'palabra de la lista',
  enlace: 'tiene un enlace',
  repetido: 'mismo texto repetido en 24 h',
  '10_reportes': 'se ocultó solo al llegar a 10 reportes',
};

const statusLabels: Record<string, string> = {
  visible: 'visible',
  hidden: 'oculto',
};

const actionLabels: Record<string, string> = {
  reviewed: 'revisado sin cambios',
  hide: 'ocultado',
  restore: 'restaurado',
  auto_hide: 'ocultado por 10 reportes',
};

const PREVIEW_LENGTH = 280;
const MAX_REPLIES_SHOWN = 30;

// Evita que un texto cierre la etiqueta y se haga pasar por instrucciones.
function userText(text: string): string {
  const safeText = text.replaceAll('<', '‹').replaceAll('>', '›');
  return `<texto_de_usuario>${safeText}</texto_de_usuario>`;
}

function preview(text: string): string {
  if (text.length <= PREVIEW_LENGTH) {
    return text;
  }
  return `${text.slice(0, PREVIEW_LENGTH)}…`;
}

function formatDate(isoDate: string): string {
  return `${new Date(isoDate).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function formatCounts(counts: Record<string, number>, labels: Record<string, string> = {}): string {
  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return 'ninguno';
  }
  return entries.map(([key, total]) => `${labels[key] ?? key}: ${total}`).join(', ');
}

function targetLabel(postId: number | null, commentId: number | null): string {
  if (commentId !== null) {
    return `respuesta comment_id=${commentId}`;
  }
  return `publicación post_id=${postId}`;
}

export function formatPendingList(items: PendingItem[], limit: number): string {
  if (items.length === 0) {
    return 'No hay nada pendiente de revisión.';
  }

  const lines = [`# Pendientes (${items.length}, los más antiguos primero)`, ''];
  for (const item of items) {
    const target = item.tipo === 'publicacion'
      ? `Publicación post_id=${item.post_id}`
      : `Respuesta comment_id=${item.comment_id} (en post_id=${item.post_id})`;
    lines.push(`## ${target}`);
    lines.push(`- Razones: ${item.razones.map((reason) => reasonLabels[reason] ?? reason).join(', ')}`);
    lines.push(`- Reportes: ${formatCounts(item.reportes)}`);
    lines.push(`- Autor: ${item.autor} (advertencias activas: ${item.advertencias_del_autor})`);
    lines.push(`- Estado: ${statusLabels[item.estado] ?? item.estado}`);
    lines.push(`- Pendiente desde: ${formatDate(item.pendiente_desde)}`);
    if (item.titulo !== null && item.tipo === 'publicacion') {
      lines.push(`- Título: ${userText(item.titulo)}`);
    }
    lines.push(`- Texto: ${userText(preview(item.texto))}`);
    lines.push('');
  }

  if (items.length === limit) {
    lines.push(`Puede haber más. Revisa estos primero o pide más con limite mayor (hasta 50).`);
  }
  lines.push('Para ver el texto completo, sus versiones y respuestas usa ver_contenido.');
  return lines.join('\n');
}

export function formatContent(detail: ContentDetail): string {
  const lines: string[] = [];
  if (detail.tipo === 'publicacion') {
    lines.push(`# Publicación post_id=${detail.post_id}`);
    lines.push(`- Título: ${userText(detail.titulo ?? '')}`);
  } else {
    lines.push(`# Respuesta comment_id=${detail.comment_id} (en post_id=${detail.post_id})`);
    lines.push(`- Publicación: ${userText(detail.titulo_de_la_publicacion ?? '')}`);
  }

  lines.push(`- Autor: ${detail.autor}`);
  lines.push(`- Estado: ${statusLabels[detail.estado] ?? detail.estado}${detail.borrada ? ', borrado por su autor' : ''}`);
  lines.push(`- Creado: ${formatDate(detail.creada)}${detail.editada ? `, editado ${formatDate(detail.editada)}` : ''}`);
  lines.push(`- Reportes: ${formatCounts(detail.reportes)}`);
  if (detail.pendiente) {
    const reasons = detail.pendiente.razones.map((reason) => reasonLabels[reason] ?? reason).join(', ');
    lines.push(`- En la cola desde ${formatDate(detail.pendiente.desde)}: ${reasons}`);
  } else {
    lines.push('- No está en la cola de revisión.');
  }
  lines.push('', '## Texto', userText(detail.texto));

  if (detail.versiones_anteriores.length > 0) {
    lines.push('', `## Versiones anteriores (${detail.versiones_anteriores.length})`);
    for (const version of detail.versiones_anteriores) {
      const title = version.titulo ? `${userText(version.titulo)} ` : '';
      lines.push(`- ${formatDate(version.escrita)}: ${title}${userText(version.texto)}`);
    }
  }

  if (detail.respuestas && detail.respuestas.length > 0) {
    lines.push('', `## Respuestas (${detail.respuestas.length})`);
    for (const reply of detail.respuestas.slice(0, MAX_REPLIES_SHOWN)) {
      const notes = [reply.estado === 'hidden' ? 'oculta' : '', reply.borrada ? 'borrada' : '']
        .filter((note) => note !== '')
        .join(', ');
      lines.push(`- comment_id=${reply.comment_id}, ${reply.autor}${notes ? ` (${notes})` : ''}: ${userText(preview(reply.texto))}`);
    }
    if (detail.respuestas.length > MAX_REPLIES_SHOWN) {
      lines.push(`Hay ${detail.respuestas.length - MAX_REPLIES_SHOWN} respuestas más; ábrelas con ver_contenido y su comment_id.`);
    }
  }

  return lines.join('\n');
}

export function formatAuthor(author: AuthorDetail): string {
  const lines = [
    `# ${author.alias}`,
    `- Desde: ${formatDate(author.desde)}`,
    `- Publicaciones: ${author.publicaciones} (${author.publicaciones_ocultas} ocultas)`,
    `- Respuestas: ${author.respuestas} (${author.respuestas_ocultas} ocultas)`,
    `- Advertencias activas: ${author.advertencias}`,
  ];

  if (author.avisos.length > 0) {
    lines.push('', '## Avisos que ha recibido');
    for (const notice of author.avisos) {
      const state = notice.retirado ? 'retirado' : notice.cuenta ? 'cuenta' : 'no cuenta (automático)';
      lines.push(`- ${formatDate(notice.fecha)}, ${targetLabel(notice.post_id, notice.comment_id)}, ${notice.categoria}, ${state}: ${notice.mensaje}`);
    }
  }

  if (author.acciones_recientes.length > 0) {
    lines.push('', '## Acciones recientes de moderación');
    for (const action of author.acciones_recientes) {
      const details = [action.categoria, action.nota].filter((value) => value !== null).join(', ');
      lines.push(`- ${formatDate(action.fecha)}, ${actionLabels[action.accion] ?? action.accion}, ${targetLabel(action.post_id, action.comment_id)}${details ? `: ${details}` : ''}`);
    }
  }

  return lines.join('\n');
}

export function formatSummary(summary: Summary): string {
  return [
    `# Resumen desde ${formatDate(summary.desde)}`,
    `- Publicaciones nuevas: ${summary.publicaciones_nuevas}`,
    `- Respuestas nuevas: ${summary.respuestas_nuevas}`,
    `- Reportes: ${formatCounts(summary.reportes)}`,
    `- Pendientes nuevos: ${summary.pendientes_nuevos}`,
    `- Pendientes abiertos ahora: ${summary.pendientes_abiertos}`,
    `- Acciones: ${formatCounts(summary.acciones, actionLabels)}`,
  ].join('\n');
}
