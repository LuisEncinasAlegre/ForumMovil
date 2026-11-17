# ForumMovil

Foro móvil anónimo para la materia de Desarrollo de Aplicaciones Móviles. Entras sin correo ni
contraseña: la app te da un alias al azar (por ejemplo `farol-veloz`) y con él publicas y comentas.

- **App:** Expo SDK 57 + React Native + TypeScript, en `app/`.
- **Backend:** Supabase (sesiones anónimas, PostgreSQL y Row Level Security), en `supabase/`.

## Cómo correrla

### 1. Proyecto de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **Authentication → Sign In / Providers**, activa **Allow anonymous sign-ins**.
3. En el **SQL Editor**, pega y corre cada archivo de `supabase/migrations/` en orden.
4. En **Project Settings → API Keys**, copia la URL del proyecto y la llave publicable.

### 2. Variables de entorno

```bash
cd app
cp .env.example .env
```

Llena `.env` con la URL y la llave publicable. Nunca pongas aquí la llave secreta: todo lo que
empieza con `EXPO_PUBLIC_` termina dentro de la app.

### 3. App

```bash
cd app
npm install
npx expo start      # escanea el QR con Expo Go
```

## Comandos (dentro de `app/`)

| Comando | Qué hace |
| --- | --- |
| `npm run lint` | ESLint |
| `npm run tsc` | Revisa los tipos de TypeScript |
| `npm test` | Pruebas unitarias y de componentes |
| `npm run test:db` | Pruebas de seguridad contra el proyecto de Supabase del `.env` (crea usuarios anónimos de prueba) |

### Pruebas de la base de datos

`npm run test:db` necesita, además de `app/.env`, el archivo `app/db-tests/.env.test`
(cópialo de `db-tests/.env.example`) con la llave secreta del proyecto y el token de un moderador
de prueba. Ese archivo no se sube. En GitHub Actions los mismos valores van como secretos del
repositorio: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY` y `MODERATOR_TEST_TOKEN`.

Cada corrida crea unos 40 usuarios anónimos. En desarrollo el límite de inicios de sesión anónimos
está alto (**Authentication → Rate Limits**); si sale `Request rate limit reached`, espera o súbelo.

Qué prueban, cómo actualizar la instantánea de permisos y los límites conocidos: [SECURITY.md](SECURITY.md).

### Prueba de carga

Simula a muchas personas usando la app a la vez contra el proyecto del `.env`. Usa los mismos
archivos que `test:db`. **Nunca la corras contra un proyecto con usuarios reales.**

| Comando | Qué hace |
| --- | --- |
| `npm run load:pool -- --perfil humo` | Crea los usuarios simulados del perfil (10, 60 o 120): sesión anónima, reglas aceptadas y un teléfono `carga-…` |
| `npm run load:seed -- --posts 2000 --respuestas 3` | Llena el foro con publicaciones y respuestas de esos usuarios |
| `npm run load:run -- --perfil humo` | Corre la carga y muestra p50/p95/p99 y errores por llamada; guarda el resultado en `load-tests/results/` |
| `npm run load:clean` | Borra a todos los usuarios `carga-…` y lo que escribieron |

Perfiles: `humo` (1 vuelta/s, la línea base), `clase` (unas 40 personas, 8 vueltas/s) y `estres`
(sube hasta 32 vueltas/s). Corre `humo` primero: `clase` y `estres` comparan sus lecturas contra él.

- Los tokens duran una hora y no se refrescan: `pool`, `seed` y `run` van en la misma hora.
- Cada usuario cuenta para el límite de inicios de sesión anónimos por hora; revísalo antes.
- Si una corrida se cae, `load:clean` encuentra a los usuarios por su teléfono `carga-…`.
- [`load-tests/queries.sql`](app/load-tests/queries.sql) tiene las consultas para el SQL editor:
  reiniciar las estadísticas, ver las consultas más lentas y el plan del foro.
- Las partes sin red (percentiles, errores, escenario y reloj) tienen pruebas en `npm test`.

## Moderación

La moderación se hace a mano con un servidor MCP (la Edge Function `moderacion`). Las revisiones
automáticas (palabras de `private.flag_words`, enlaces, texto repetido y reportes) llenan una cola;
quien modera la revisa y decide.

### Publicar la función

En el dashboard, **Edge Functions → Deploy a new function**, con el nombre `moderacion` y los
archivos de `supabase/functions/moderacion/`. Desactiva **Verify JWT**: la función revisa su propio
token de moderador.

### Crear un moderador

En el **SQL Editor**:

```sql
select private.create_moderator('Ana');
```

Devuelve el token **una sola vez**; en la base solo queda su hash. Para quitarle el acceso:

```sql
update private.moderators set disabled_at = now() where name = 'Ana';
```

### Conectarse

Con Claude Code:

```bash
claude mcp add --transport http moderacion https://<ref>.supabase.co/functions/v1/moderacion \
  --header "Authorization: Bearer <token>"
```

También sirve el MCP Inspector (`npx @modelcontextprotocol/inspector`), sin IA. Herramientas:
`ver_pendientes`, `ver_contenido`, `ver_autor`, `resumen`, `marcar_revisado`, `ocultar`,
`restaurar`, `suspender`, `banear` y `quitar_ban`. Deja activada la aprobación de cada herramienta: el
texto de los usuarios podría traer instrucciones, y todas menos las de lectura (`ver_*` y `resumen`)
cambian lo que ve o puede hacer la gente. Una suspensión o un baneo alcanza también a los teléfonos
que usó esa cuenta.

## Tipos de la base de datos

`app/src/lib/database.types.ts` sale del esquema. Después de cada migración, regenéralo desde el
dashboard (**API Docs → TypeScript**) o con
`npx supabase gen types typescript --remote=<ref> --schema public`.
