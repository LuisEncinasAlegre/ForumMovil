// Llena el foro con publicaciones y respuestas de los usuarios de carga, para medir consultas sobre
// miles de filas y no sobre unas cuantas. Usa la llave secreta y fechas de hace días: así no choca
// con los límites por minuto. Los triggers de revisión corren igual que siempre.
import type { SupabaseClient } from '@supabase/supabase-js';

import type { LoadUser } from './pool.ts';
import { pickFrom } from './scenario.ts';

export type SeedOptions = {
  posts: number;
  repliesPerPost: number;
};

// Con el autor, para que nadie reporte lo suyo (RLS no lo deja).
export type SeededPost = {
  id: number;
  authorId: string;
};

export type SeedResult = {
  posts: SeededPost[];
  commentCount: number;
};

const INSERT_BATCH_SIZE = 250;
const SEED_DAYS = 14;

// Texto común de estudiantes. Revisado contra private.flag_words para que nada vaya a revisión.
const TITLE_STARTS = ['¿Alguien sabe', 'Pregunta sobre', 'Opiniones de', 'Busco info de', 'Recomiendan algo para'];
const TOPICS = [
  'el horario de la biblioteca',
  'la tarea de cálculo',
  'el examen de física',
  'las rutas de camión al campus',
  'un buen lugar para estudiar',
  'la cafetería nueva',
  'el torneo de futbol',
  'clases de guitarra',
  'la feria de empleo',
  'el laboratorio de química',
];
const SENTENCES = [
  'Llevo toda la semana con esto y no encuentro respuesta.',
  'Me dijeron que preguntara aquí.',
  'Cualquier dato ayuda, gracias.',
  'Ya revisé la página de la escuela y no viene.',
  'Pregunto porque es mi primer semestre.',
  'Si alguien fue el año pasado, cuéntenme cómo estuvo.',
  'A mí me funcionó llegar temprano.',
  'Yo también quiero saber.',
  'Creo que cambia cada semestre.',
  'Pregúntale a la coordinación, ellos sí saben.',
];

export function makeTitle(random: () => number): string {
  return `${pickFrom(TITLE_STARTS, random)} ${pickFrom(TOPICS, random)}`;
}

export function makeContent(random: () => number): string {
  const count = 1 + Math.floor(random() * 3);
  const sentences: string[] = [];
  for (let index = 0; index < count; index += 1) {
    sentences.push(pickFrom(SENTENCES, random));
  }
  return sentences.join(' ');
}

function randomPastDate(random: () => number): string {
  // al menos 25 horas atrás: fuera del minuto de los límites y de las 24 horas en que la revisión
  // busca texto repetido (el vocabulario es corto y se repite a propósito)
  const minimumMs = 25 * 60 * 60 * 1000;
  const spanMs = SEED_DAYS * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - minimumMs - random() * spanMs).toISOString();
}

async function insertPosts(admin: SupabaseClient, rows: object[]): Promise<SeededPost[]> {
  const { data, error } = await admin.from('posts').insert(rows).select('id, author_id');
  if (error) {
    throw new Error('No se pudieron crear las publicaciones: ' + error.message);
  }
  return data.map((row: { id: number; author_id: string }) => ({ id: row.id, authorId: row.author_id }));
}

async function insertComments(admin: SupabaseClient, rows: object[]): Promise<void> {
  const { error } = await admin.from('comments').insert(rows);
  if (error) {
    throw new Error('No se pudieron crear las respuestas: ' + error.message);
  }
}

export async function seedForum(
  admin: SupabaseClient,
  users: LoadUser[],
  options: SeedOptions,
  random: () => number,
): Promise<SeedResult> {
  if (users.length === 0) {
    throw new Error('El grupo de usuarios está vacío.');
  }

  // las fechas van de la más vieja a la más nueva para que el orden por id se parezca al real
  const postDates = Array.from({ length: options.posts }, () => randomPastDate(random)).sort();
  const posts: SeededPost[] = [];
  for (let start = 0; start < options.posts; start += INSERT_BATCH_SIZE) {
    const rows = postDates.slice(start, start + INSERT_BATCH_SIZE).map((createdAt) => ({
      author_id: pickFrom(users, random).userId,
      title: makeTitle(random),
      content: makeContent(random),
      created_at: createdAt,
    }));
    posts.push(...(await insertPosts(admin, rows)));
    console.log(`  ${posts.length}/${options.posts} publicaciones`);
  }

  let commentCount = 0;
  let pendingComments: object[] = [];
  for (const post of posts) {
    for (let index = 0; index < options.repliesPerPost; index += 1) {
      pendingComments.push({
        post_id: post.id,
        author_id: pickFrom(users, random).userId,
        content: makeContent(random),
        created_at: randomPastDate(random),
      });
    }
    if (pendingComments.length >= INSERT_BATCH_SIZE) {
      await insertComments(admin, pendingComments);
      commentCount += pendingComments.length;
      pendingComments = [];
      console.log(`  ${commentCount} respuestas`);
    }
  }
  if (pendingComments.length > 0) {
    await insertComments(admin, pendingComments);
    commentCount += pendingComments.length;
  }

  return { posts, commentCount };
}
