// Qué hace cada usuario simulado en cada vuelta. Los pesos imitan a alguien que lee mucho más de
// lo que escribe. Las esperas por usuario mantienen la prueba debajo de los límites por minuto
// (2 publicaciones, 3 respuestas): así un "demasiadas_*" en el reporte es un hallazgo y no ruido.

export type ActionName = 'abrir' | 'leer' | 'hilo' | 'responder' | 'publicar' | 'reportar';

// suman 100
export const ACTION_WEIGHTS: Record<ActionName, number> = {
  abrir: 10,
  leer: 55,
  hilo: 20,
  responder: 8,
  publicar: 5,
  reportar: 2,
};

const ACTION_ORDER: ActionName[] = ['abrir', 'leer', 'hilo', 'responder', 'publicar', 'reportar'];

export const POST_COOLDOWN_MS = 40_000;
export const REPLY_COOLDOWN_MS = 25_000;

type UserCooldown = { lastPostAt: number; lastReplyAt: number };
export type Cooldowns = Map<string, UserCooldown>;

// random() da un número en [0, 1), como Math.random.
export function pickAction(random: () => number): ActionName {
  let total = 0;
  for (const name of ACTION_ORDER) {
    total += ACTION_WEIGHTS[name];
  }
  let roll = random() * total;
  for (const name of ACTION_ORDER) {
    roll -= ACTION_WEIGHTS[name];
    if (roll < 0) {
      return name;
    }
  }
  return 'leer';
}

function cooldownOf(cooldowns: Cooldowns, userId: string): UserCooldown {
  return cooldowns.get(userId) ?? { lastPostAt: -Infinity, lastReplyAt: -Infinity };
}

export function canPublish(cooldowns: Cooldowns, userId: string, now: number): boolean {
  return now - cooldownOf(cooldowns, userId).lastPostAt >= POST_COOLDOWN_MS;
}

export function canReply(cooldowns: Cooldowns, userId: string, now: number): boolean {
  return now - cooldownOf(cooldowns, userId).lastReplyAt >= REPLY_COOLDOWN_MS;
}

export function markPublished(cooldowns: Cooldowns, userId: string, now: number): void {
  cooldowns.set(userId, { ...cooldownOf(cooldowns, userId), lastPostAt: now });
}

export function markReplied(cooldowns: Cooldowns, userId: string, now: number): void {
  cooldowns.set(userId, { ...cooldownOf(cooldowns, userId), lastReplyAt: now });
}

// Si el usuario todavía está esperando para escribir, mejor lee: no se pierde la vuelta.
export function actionAllowedNow(action: ActionName, cooldowns: Cooldowns, userId: string, now: number): ActionName {
  if (action === 'publicar' && !canPublish(cooldowns, userId, now)) {
    return 'leer';
  }
  if (action === 'responder' && !canReply(cooldowns, userId, now)) {
    return 'leer';
  }
  return action;
}

export function pickFrom<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}
