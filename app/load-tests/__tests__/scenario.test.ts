import {
  actionAllowedNow,
  canPublish,
  canReply,
  markPublished,
  markReplied,
  pickAction,
  POST_COOLDOWN_MS,
  REPLY_COOLDOWN_MS,
  type Cooldowns,
} from '../scenario.ts';

describe('pickAction', () => {
  test('cada peso cubre su tramo de 0 a 100', () => {
    expect(pickAction(() => 0)).toBe('abrir');
    expect(pickAction(() => 0.0999)).toBe('abrir');
    expect(pickAction(() => 0.1)).toBe('leer');
    expect(pickAction(() => 0.6499)).toBe('leer');
    expect(pickAction(() => 0.65)).toBe('hilo');
    expect(pickAction(() => 0.85)).toBe('responder');
    expect(pickAction(() => 0.93)).toBe('publicar');
    expect(pickAction(() => 0.98)).toBe('reportar');
    expect(pickAction(() => 0.9999)).toBe('reportar');
  });
});

describe('esperas por usuario', () => {
  test('después de publicar espera POST_COOLDOWN_MS', () => {
    const cooldowns: Cooldowns = new Map();
    expect(canPublish(cooldowns, 'ana', 0)).toBe(true);

    markPublished(cooldowns, 'ana', 1_000);

    expect(canPublish(cooldowns, 'ana', 1_000 + POST_COOLDOWN_MS - 1)).toBe(false);
    expect(canPublish(cooldowns, 'ana', 1_000 + POST_COOLDOWN_MS)).toBe(true);
    // otra persona no espera
    expect(canPublish(cooldowns, 'beto', 1_000)).toBe(true);
    // publicar no bloquea responder
    expect(canReply(cooldowns, 'ana', 1_000)).toBe(true);
  });

  test('después de responder espera REPLY_COOLDOWN_MS', () => {
    const cooldowns: Cooldowns = new Map();
    markReplied(cooldowns, 'ana', 0);

    expect(canReply(cooldowns, 'ana', REPLY_COOLDOWN_MS - 1)).toBe(false);
    expect(canReply(cooldowns, 'ana', REPLY_COOLDOWN_MS)).toBe(true);
  });

  test('si todavía espera, lee en lugar de escribir', () => {
    const cooldowns: Cooldowns = new Map();
    markPublished(cooldowns, 'ana', 0);
    markReplied(cooldowns, 'ana', 0);

    expect(actionAllowedNow('publicar', cooldowns, 'ana', 1)).toBe('leer');
    expect(actionAllowedNow('responder', cooldowns, 'ana', 1)).toBe('leer');
    expect(actionAllowedNow('hilo', cooldowns, 'ana', 1)).toBe('hilo');
  });
});
