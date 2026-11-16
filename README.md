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

Cada corrida crea usuarios anónimos, y Supabase permite 30 inicios de sesión anónimos por hora
desde la misma IP. Si sale `Request rate limit reached`, espera o sube el límite en
**Authentication → Rate Limits**.

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
`ver_pendientes`, `ver_contenido`, `ver_autor`, `resumen`, `marcar_revisado`, `ocultar` y
`restaurar`. Deja activada la aprobación de cada herramienta: el texto de los usuarios podría traer
instrucciones, y `ocultar` y `restaurar` cambian lo que ve la gente.

## Tipos de la base de datos

`app/src/lib/database.types.ts` sale del esquema. Después de cada migración, regenéralo desde el
dashboard (**API Docs → TypeScript**) o con
`npx supabase gen types typescript --remote=<ref> --schema public`.
