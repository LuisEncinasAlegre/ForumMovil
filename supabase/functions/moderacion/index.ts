// Servidor MCP para moderar a mano. Cada moderador usa su propio token:
// Authorization: Bearer <token>. El token se crea con private.create_moderator en el editor SQL.
import { adminClient } from './adminClient.ts';
import { mcpHandler } from './server.ts';

const TOKEN_LENGTH = 64;

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Falta un token de moderación válido.' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer' },
  });
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization') ?? '';
  if (!header.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice('Bearer '.length).trim();
  if (token.length !== TOKEN_LENGTH) {
    return null;
  }
  return token;
}

// Devuelve el id del moderador, o null si el token no sirve. Otros errores se lanzan.
async function findModeratorId(token: string): Promise<number | null> {
  const { data, error } = await adminClient.rpc('mod_whoami', { token });
  if (error) {
    if (error.message === 'token_invalido') {
      return null;
    }
    throw new Error(`No se pudo verificar el token: ${error.message}`);
  }
  return Number(data);
}

async function handleRequest(request: Request): Promise<Response> {
  const token = readBearerToken(request);
  if (token === null) {
    return unauthorized();
  }

  const moderatorId = await findModeratorId(token);
  if (moderatorId === null) {
    return unauthorized();
  }

  return mcpHandler.fetch(request, {
    authInfo: { token, clientId: `moderador-${moderatorId}`, scopes: [], extra: { moderatorId } },
  });
}

Deno.serve(handleRequest);
