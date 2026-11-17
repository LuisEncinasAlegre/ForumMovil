// Columnas que pide la app. Sin imports, para que las pruebas de carga manden las mismas consultas.
// (texto literal: supabase-js deduce los tipos solo de un texto literal)

// El alias viene de profiles por la llave foránea author_id (una sola consulta).
export const COMMENT_COLUMNS = 'id, post_id, content, created_at, edited_at, author:profiles(id, display_name, color, restriction)';
