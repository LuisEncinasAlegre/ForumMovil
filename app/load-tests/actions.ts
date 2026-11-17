// Lo que hace un usuario simulado, con las mismas consultas que la app (las columnas se importan de
// las features; los filtros copian a cada api.ts y hay que cambiarlos junto con ellos).
// Ninguna acción lanza: cada llamada queda como muestra en las métricas.
import type { SupabaseClient } from '@supabase/supabase-js';

import { COMMENT_COLUMNS } from '../src/features/comments/columns.ts';
import { NOTICE_COLUMNS } from '../src/features/moderation/columns.ts';
import { POST_COLUMNS, POST_WITH_REPLIES_COLUMNS } from '../src/features/posts/columns.ts';
import { MY_PROFILE_COLUMNS } from '../src/features/session/columns.ts';
import { timeCall, type Metrics } from './metrics.ts';
import type { LoadUser } from './pool.ts';
import {
  actionAllowedNow,
  markPublished,
  markReplied,
  pickAction,
  pickFrom,
  type Cooldowns,
} from './scenario.ts';
import { makeContent, makeTitle, type SeededPost } from './seed.ts';

// Igual que FEED_PAGE_SIZE y COMMENTS_PAGE_SIZE en la app.
const FEED_PAGE_SIZE = 20;
const COMMENTS_PAGE_SIZE = 50;
// 23505 = ya lo reportaste (unique); la app lo trata como enviado
const ALREADY_REPORTED = '23505';

export type ActionContext = {
  client: SupabaseClient;
  user: LoadUser;
  metrics: Metrics;
  random: () => number;
};

// Como fetchFeedPage en features/posts/api.ts.
async function fetchFeedPage(context: ActionContext, beforeId: number | null): Promise<number | null> {
  const response = await timeCall(context.metrics, 'foro', () => {
    let query = context.client
      .from('posts')
      .select(POST_WITH_REPLIES_COLUMNS)
      .eq('status', 'visible')
      .is('deleted_at', null)
      .eq('comments.status', 'visible')
      .is('comments.deleted_at', null);
    if (beforeId !== null) {
      query = query.lt('id', beforeId);
    }
    return query.order('id', { ascending: false }).limit(FEED_PAGE_SIZE);
  });
  const rows = response?.data;
  if (!rows || rows.length === 0) {
    return null;
  }
  return rows[rows.length - 1].id;
}

// Abrir la app ya con sesión: perfil, baneo, avisos de moderación y la primera página del foro.
export async function openApp(context: ActionContext): Promise<void> {
  const { client, metrics, user } = context;
  await Promise.all([
    timeCall(metrics, 'abrir:perfil', () =>
      client.from('profiles').select(MY_PROFILE_COLUMNS).eq('id', user.userId).maybeSingle(),
    ),
    timeCall(metrics, 'abrir:baneo', () => client.rpc('get_my_active_ban')),
    timeCall(metrics, 'abrir:avisos', () =>
      client
        .from('moderation_notices')
        .select(NOTICE_COLUMNS)
        .is('seen_at', null)
        .is('withdrawn_at', null)
        .order('id', { ascending: true }),
    ),
  ]);
  await fetchFeedPage(context, null);
}

// Primera página y luego bajar (pages - 1) páginas más.
export async function readFeed(context: ActionContext, pages: number): Promise<void> {
  let beforeId: number | null = null;
  for (let page = 0; page < pages; page += 1) {
    const lastId = await fetchFeedPage(context, beforeId);
    if (lastId === null) {
      return;
    }
    beforeId = lastId;
  }
}

// Como fetchPost y fetchCommentsPage: la app pide las dos al abrir el hilo.
export async function openThread(context: ActionContext, postId: number): Promise<void> {
  const { client, metrics } = context;
  await Promise.all([
    timeCall(metrics, 'hilo:publicacion', () =>
      client
        .from('posts')
        .select(POST_WITH_REPLIES_COLUMNS)
        .eq('id', postId)
        .eq('status', 'visible')
        .is('deleted_at', null)
        .eq('comments.status', 'visible')
        .is('comments.deleted_at', null)
        .maybeSingle(),
    ),
    timeCall(metrics, 'hilo:respuestas', () =>
      client
        .from('comments')
        .select(COMMENT_COLUMNS)
        .eq('post_id', postId)
        .eq('status', 'visible')
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .limit(COMMENTS_PAGE_SIZE),
    ),
  ]);
}

export async function replyToPost(context: ActionContext, postId: number): Promise<void> {
  await timeCall(context.metrics, 'responder', () =>
    context.client
      .from('comments')
      .insert({ post_id: postId, content: makeContent(context.random) })
      .select(COMMENT_COLUMNS)
      .single(),
  );
}

export async function publishPost(context: ActionContext): Promise<void> {
  await timeCall(context.metrics, 'publicar', () =>
    context.client
      .from('posts')
      .insert({ title: makeTitle(context.random), content: makeContent(context.random) })
      .select(POST_COLUMNS)
      .single(),
  );
}

// Solo a publicaciones sembradas: 10 reportes ocultan una publicación y no queremos tocar las reales.
export async function reportPost(context: ActionContext, postId: number): Promise<void> {
  await timeCall(
    context.metrics,
    'reportar',
    () => context.client.from('reports').insert({ post_id: postId, reason: 'spam' }),
    [ALREADY_REPORTED],
  );
}

// RLS no deja reportar lo propio. Con pocos usuarios, una de cada pocas es tuya: se busca otra.
function pickPostByAnotherAuthor(posts: SeededPost[], userId: string, random: () => number): number {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const post = pickFrom(posts, random);
    if (post.authorId !== userId) {
      return post.id;
    }
  }
  throw new Error('No hay publicaciones sembradas de otra persona para reportar.');
}

export type ScenarioState = {
  users: LoadUser[];
  clients: Map<string, SupabaseClient>;
  seededPosts: SeededPost[];
  cooldowns: Cooldowns;
  metrics: Metrics;
  random: () => number;
  nextUserIndex: number;
};

// Una vuelta: el siguiente usuario (en orden, para repartir la carga) hace una acción al azar.
export async function runIteration(state: ScenarioState): Promise<void> {
  const user = state.users[state.nextUserIndex % state.users.length];
  state.nextUserIndex += 1;
  const client = state.clients.get(user.userId);
  if (!client) {
    throw new Error('Falta el cliente de ' + user.userId);
  }
  const context: ActionContext = {
    client,
    user,
    metrics: state.metrics,
    random: state.random,
  };
  const now = Date.now();
  const action = actionAllowedNow(pickAction(state.random), state.cooldowns, user.userId, now);
  const postId = pickFrom(state.seededPosts, state.random).id;

  if (action === 'abrir') {
    await openApp(context);
  } else if (action === 'leer') {
    await readFeed(context, 1 + Math.floor(state.random() * 3));
  } else if (action === 'hilo') {
    await openThread(context, postId);
  } else if (action === 'responder') {
    markReplied(state.cooldowns, user.userId, now);
    await openThread(context, postId);
    await replyToPost(context, postId);
  } else if (action === 'publicar') {
    markPublished(state.cooldowns, user.userId, now);
    await publishPost(context);
  } else {
    await reportPost(context, pickPostByAnotherAuthor(state.seededPosts, user.userId, state.random));
  }
}
