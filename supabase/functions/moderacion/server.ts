import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { callModerationFunction } from './adminClient.ts';
import {
  type AuthorDetail,
  type BanResult,
  type ContentDetail,
  formatAuthor,
  formatBanResult,
  formatContent,
  formatPendingList,
  formatSummary,
  type PendingItem,
  type Summary,
} from './format.ts';
import {
  banear,
  marcarRevisado,
  ocultar,
  quitarBan,
  restaurar,
  resumen,
  suspender,
  verAutor,
  verContenido,
  verPendientes,
} from './tools.ts';

type ToolResult = { content: { type: 'text'; text: string }[] };

function textResult(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

function toNullable(value: number | undefined): number | null {
  return value ?? null;
}

function sevenDaysAgo(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

// Se crea un servidor nuevo por petición, ya con el id de quien modera.
function buildServer(moderatorId: number): McpServer {
  const server = new McpServer({ name: 'forummovil-moderacion', version: '1.0.0' });

  server.registerTool(
    'ver_pendientes',
    { ...verPendientes, annotations: { readOnlyHint: true, openWorldHint: false } },
    async ({ limite }) => {
      const items = await callModerationFunction('mod_list_pending', { max_items: limite });
      return textResult(formatPendingList(items as PendingItem[], limite));
    },
  );

  server.registerTool(
    'ver_contenido',
    { ...verContenido, annotations: { readOnlyHint: true, openWorldHint: false } },
    async ({ post_id, comment_id }) => {
      const detail = await callModerationFunction('mod_get_content', {
        target_post_id: toNullable(post_id),
        target_comment_id: toNullable(comment_id),
      });
      return textResult(formatContent(detail as ContentDetail));
    },
  );

  server.registerTool(
    'ver_autor',
    { ...verAutor, annotations: { readOnlyHint: true, openWorldHint: false } },
    async ({ alias }) => {
      const author = await callModerationFunction('mod_get_author', { alias });
      return textResult(formatAuthor(author as AuthorDetail));
    },
  );

  server.registerTool(
    'resumen',
    { ...resumen, annotations: { readOnlyHint: true, openWorldHint: false } },
    async ({ desde }) => {
      const since = desde ?? sevenDaysAgo();
      if (Number.isNaN(Date.parse(since))) {
        throw new Error('La fecha no se entiende. Usa el formato 2026-11-10 o 2026-11-10T08:00:00Z.');
      }
      const summary = await callModerationFunction('mod_summary', { since });
      return textResult(formatSummary(summary as Summary));
    },
  );

  server.registerTool(
    'marcar_revisado',
    { ...marcarRevisado, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } },
    async ({ post_id, comment_id, nota }) => {
      await callModerationFunction('mod_mark_reviewed', {
        moderator_id: moderatorId,
        target_post_id: toNullable(post_id),
        target_comment_id: toNullable(comment_id),
        note: nota ?? null,
      });
      return textResult('Listo: salió de la cola sin cambios.');
    },
  );

  server.registerTool(
    'ocultar',
    { ...ocultar, annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false } },
    async ({ post_id, comment_id, categoria, mensaje }) => {
      await callModerationFunction('mod_hide', {
        moderator_id: moderatorId,
        target_post_id: toNullable(post_id),
        target_comment_id: toNullable(comment_id),
        category: categoria,
        message: mensaje,
      });
      return textResult('Listo: está oculto y su autor verá el aviso la próxima vez que abra la app.');
    },
  );

  server.registerTool(
    'restaurar',
    { ...restaurar, annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false } },
    async ({ post_id, comment_id, nota }) => {
      await callModerationFunction('mod_restore', {
        moderator_id: moderatorId,
        target_post_id: toNullable(post_id),
        target_comment_id: toNullable(comment_id),
        note: nota ?? null,
      });
      return textResult('Listo: vuelve a estar visible y su aviso ya no cuenta.');
    },
  );

  const banAnnotations = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false };

  server.registerTool(
    'suspender',
    { ...suspender, annotations: banAnnotations },
    async ({ alias, motivo, horas }) => {
      const result = await callModerationFunction('mod_ban', { moderator_id: moderatorId, alias, reason: motivo, hours: horas });
      return textResult(formatBanResult(result as BanResult));
    },
  );

  server.registerTool(
    'banear',
    { ...banear, annotations: banAnnotations },
    async ({ alias, motivo }) => {
      const result = await callModerationFunction('mod_ban', { moderator_id: moderatorId, alias, reason: motivo, hours: null });
      return textResult(formatBanResult(result as BanResult));
    },
  );

  server.registerTool(
    'quitar_ban',
    { ...quitarBan, annotations: banAnnotations },
    async ({ alias, nota }) => {
      await callModerationFunction('mod_unban', { moderator_id: moderatorId, alias, note: nota ?? null });
      return textResult(`Listo: ${alias} y sus teléfonos vuelven a poder escribir.`);
    },
  );

  return server;
}

export const mcpHandler = createMcpHandler(({ authInfo }) => {
  // index.ts solo deja pasar peticiones con un token válido
  const moderatorId = authInfo?.extra?.moderatorId;
  if (typeof moderatorId !== 'number') {
    throw new Error('Petición sin moderador verificado.');
  }
  return buildServer(moderatorId);
}, {
  responseMode: 'json',
  onerror: (error) => console.error('moderacion:', error.message),
});
