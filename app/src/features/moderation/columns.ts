// Columnas que pide la app. Sin imports, para que las pruebas de carga manden las mismas consultas.
// (texto literal: supabase-js deduce los tipos solo de un texto literal)

export const NOTICE_COLUMNS = 'id, post_id, comment_id, category, message, excerpt, counts_as_warning, created_at';
