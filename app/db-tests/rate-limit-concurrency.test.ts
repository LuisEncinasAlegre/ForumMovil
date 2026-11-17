// Los límites por minuto con varias inserciones al mismo tiempo de la misma persona.
// Los triggers toman un candado por autor antes de contar; sin él, todas verían "0 en el último
// minuto" y pasarían juntas.
import { createAdminClient } from './helpers/clients';
import { createPostAsAdmin } from './helpers/content';
import { signInAsMember } from './helpers/users';

const admin = createAdminClient();

type InsertResult = { error: { message: string } | null };

function countByResult(results: InsertResult[]): { accepted: number; rateLimited: number; otherErrors: string[] } {
  let accepted = 0;
  let rateLimited = 0;
  const otherErrors: string[] = [];
  for (const result of results) {
    if (!result.error) {
      accepted += 1;
    } else if (result.error.message.startsWith('demasiadas_')) {
      rateLimited += 1;
    } else {
      otherErrors.push(result.error.message);
    }
  }
  return { accepted, rateLimited, otherErrors };
}

describe('límites por minuto con inserciones al mismo tiempo', () => {
  test('de 5 publicaciones enviadas juntas solo pasan 2', async () => {
    const member = await signInAsMember();
    const attempts = [1, 2, 3, 4, 5].map((n) =>
      member.client.from('posts').insert({ title: `Al mismo tiempo ${n}`, content: 'Prueba de concurrencia.' }),
    );
    const results = await Promise.all(attempts);

    expect(countByResult(results)).toEqual({ accepted: 2, rateLimited: 3, otherErrors: [] });
  });

  test('de 6 respuestas enviadas juntas solo pasan 3', async () => {
    const author = await signInAsMember();
    const member = await signInAsMember();
    const postId = await createPostAsAdmin(admin, author, 'Hilo para respuestas al mismo tiempo');
    const attempts = [1, 2, 3, 4, 5, 6].map((n) =>
      member.client.from('comments').insert({ post_id: postId, content: `Respuesta ${n}` }),
    );
    const results = await Promise.all(attempts);

    expect(countByResult(results)).toEqual({ accepted: 3, rateLimited: 3, otherErrors: [] });
  });
});
