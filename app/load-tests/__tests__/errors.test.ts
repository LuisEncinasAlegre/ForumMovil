import { classifyResponse, errorCode } from '../errors.ts';

describe('classifyResponse', () => {
  test('sin error es ok', () => {
    expect(classifyResponse(null, 200, [])).toBe('ok');
  });

  test('el código esperado es esperado', () => {
    expect(classifyResponse({ code: '23505', message: 'duplicate key' }, 409, ['23505'])).toBe('expected');
    expect(classifyResponse({ code: '23505', message: 'duplicate key' }, 409, [])).toBe('other_error');
  });

  test('los límites de nuestros triggers', () => {
    expect(classifyResponse({ code: 'P0001', message: 'demasiadas_publicaciones' }, 400, [])).toBe('rate_limited');
    expect(classifyResponse({ code: 'P0001', message: 'demasiadas_respuestas' }, 400, [])).toBe('rate_limited');
  });

  test('el 429 de Supabase va aparte de nuestros límites', () => {
    expect(classifyResponse({ message: 'Too Many Requests' }, 429, [])).toBe('gateway_limited');
    // los errores de auth traen el status adentro
    expect(classifyResponse({ message: 'Request rate limit reached', status: 429 }, undefined, [])).toBe(
      'gateway_limited',
    );
  });

  test('5xx, tiempo agotado y red', () => {
    expect(classifyResponse({ message: 'Service Unavailable' }, 503, [])).toBe('server_error');
    expect(classifyResponse({ code: '57014', message: 'canceling statement due to statement timeout' }, 500, [])).toBe(
      'timeout',
    );
    expect(classifyResponse({ message: 'TimeoutError: The operation was aborted due to timeout' }, 0, [])).toBe(
      'timeout',
    );
    expect(classifyResponse({ message: 'TypeError: fetch failed' }, 0, [])).toBe('network_error');
  });

  test('una política de RLS que rechaza es otro error', () => {
    expect(classifyResponse({ code: '42501', message: 'new row violates row-level security policy' }, 403, [])).toBe(
      'other_error',
    );
  });
});

describe('errorCode', () => {
  test('prefiere el código de Postgres, luego el status', () => {
    expect(errorCode(null, 200)).toBeUndefined();
    expect(errorCode({ code: '42501' }, 403)).toBe('42501');
    expect(errorCode({ message: 'x' }, 503)).toBe('503');
    expect(errorCode({ name: 'AbortError' }, undefined)).toBe('AbortError');
  });
});
