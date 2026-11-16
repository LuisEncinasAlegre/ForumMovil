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

## Tipos de la base de datos

`app/src/lib/database.types.ts` sale del esquema. Después de cada migración, regenéralo desde el
dashboard (**API Docs → TypeScript**) o con
`npx supabase gen types typescript --remote=<ref> --schema public`.
