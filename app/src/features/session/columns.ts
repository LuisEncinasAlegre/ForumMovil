// Columnas que pide la app. Sin imports, para que las pruebas de carga manden las mismas consultas.
// (texto literal: supabase-js deduce los tipos solo de un texto literal)

// La fila de profile_private viene en la misma consulta (relación uno a uno con profiles).
export const MY_PROFILE_COLUMNS = 'id, display_name, color, profile_private(rules_accepted_at)';
