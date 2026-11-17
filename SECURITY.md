# Seguridad

Cómo se protege ForumMovil, cómo se prueba y qué límites conocemos.

## El modelo en una línea

La app solo tiene la llave publicable. Todo lo que una sesión puede leer o escribir lo decide la
base de datos: grants por tabla y columna, Row Level Security en cada tabla y funciones
`security definer` solo en el esquema `private`, que la api no expone. La moderación entra por la
Edge Function `moderacion` con un token por moderador; la llave secreta nunca sale del servidor.

## Cómo se prueba

Todo corre con `npm run test:db` (dentro de `app/`) contra el proyecto de Supabase del `.env`.
Ver el README para preparar `db-tests/.env.test`.

| Archivo | Qué revisa |
| --- | --- |
| `db-tests/security-matrix.test.ts` | La matriz de permisos: siete tipos de sesión (sin sesión, recién llegado, sin teléfono, miembro, otra persona, suspendido, baneado) contra cada tabla y función. Cada fila de `db-tests/matrix/cases.ts` es un permiso. |
| `db-tests/api-surface.test.ts` | Todo lo que `anon` y `authenticated` pueden tocar (grants, políticas, RLS, funciones, privilegios por defecto) comparado con una instantánea. |
| `db-tests/session.test.ts` | Tokens editados a mano, el esquema `private`, GraphQL y cerrar sesión. |
| `db-tests/mcp-http.test.ts` | Que el servidor MCP rechace todo lo que no sea un token de moderación y escape el texto de usuarios. |
| `db-tests/*.test.ts` (el resto) | Las reglas de cada función: publicar, responder, reportar, perfiles, moderación, baneos. |

Cada intento de la matriz termina en uno de tres resultados: `allowed` (pasó), `denied` (error de
permisos) o `noEffect` (sin error, pero RLS filtró la fila: un update bloqueado no da error, cambia
0 filas). Los cambios se confirman releyendo la fila con la llave secreta.

### Agregar una tabla o función

1. La migración da sus grants a mano: desde `20261120010000_security_audit.sql`, nada nuevo en
   `public` nace abierto para `anon` ni `authenticated`.
2. Agrega sus filas a `db-tests/matrix/cases.ts` (quién lee, quién escribe, quién no).
3. `api-surface.test.ts` va a fallar. Revisa la diferencia y, si es lo que querías, actualiza la
   instantánea:

   ```bash
   npm run test:db -- -u api-surface
   ```

   La diferencia de `db-tests/__snapshots__/api-surface.test.ts.snap` se revisa en el PR como
   cualquier otro cambio de permisos.

## Límites conocidos

- **El identificador del teléfono lo manda la app.** Alguien que modifique la app puede inventar
  otro y esquivar un baneo por teléfono. Sube el costo, no lo impide.
- **Un token de acceso sirve hasta que vence (1 hora).** Cerrar sesión revoca el token de
  refresco, pero no el de acceso. `session.test.ts` lo deja documentado.
- **Sin CAPTCHA.** Las sesiones anónimas solo las frena el límite por hora de Supabase.
- **La sesión se guarda en `expo-sqlite`, no en el llavero del teléfono.** Con acceso físico al
  teléfono (o a un respaldo) se podría copiar. Para un foro anónimo sin datos personales lo
  aceptamos.
- **Lo oculto o borrado lo sigue viendo su autor.** Es a propósito (para que sepa qué pasó con
  su publicación) y está en la matriz.

## Día de la demo

En **Authentication → Rate Limits** del dashboard:

- [ ] Inicios de sesión anónimos: bajar de 1000 a **30 por hora** (en desarrollo está alto porque
      cada corrida de `npm run test:db` crea unos 40 usuarios anónimos).
- [ ] Después de la demo, volver a subirlo para que corran las pruebas.

## Limpiar usuarios de prueba

Cada corrida deja usuarios anónimos con sus publicaciones. Borrar un usuario borra en cascada su
perfil, publicaciones, respuestas, reportes, avisos y teléfonos. En el editor SQL, primero busca
el id de tu propia sesión para no borrarla:

```sql
select id, display_name from public.profiles where display_name = 'tu-alias';

delete from auth.users
where is_anonymous
  and id <> 'id-de-tu-sesion'
  and created_at < now() - interval '1 hour';
```
