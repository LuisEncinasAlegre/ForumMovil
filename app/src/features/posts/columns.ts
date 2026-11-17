// Columnas que pide la app. Sin imports, para que las pruebas de carga manden las mismas consultas.
// (texto literal: supabase-js deduce los tipos solo de un texto literal)

// El alias viene de profiles por la llave foránea author_id (una sola consulta). restriction es un
// campo calculado (public.restriction): dice si la cuenta está suspendida o baneada.
export const POST_COLUMNS = 'id, title, content, status, created_at, edited_at, author:profiles(id, display_name, color, restriction)';

// Para leer también cuántas respuestas tiene. Las respuestas se filtran con
// onlyVisibleReplies, porque quien responde puede leer sus propias respuestas borradas.
export const POST_WITH_REPLIES_COLUMNS =
  'id, title, content, status, created_at, edited_at, author:profiles(id, display_name, color, restriction), comments(count)';
