// La matriz de permisos: quién puede hacer qué sobre cada tabla y función de la api.
// Revisar un permiso es leer una fila. Las filas de prueba (target) son de member salvo que el
// nombre diga otra cosa, así que para stranger son "de otra persona".
// El orden importa: los cambios permitidos van después de los intentos que esperan la fila intacta.
// Cuidado con los límites por autor (2 publicaciones y 3 respuestas por minuto): cada inserción
// permitida de un mismo actor cuenta.
import type { Outcome } from '../helpers/outcomes';
import type { ActorName, FixtureName, Fixtures } from './actors';
import type { TableName, Values } from './attempts';

export type MatrixCase =
  | {
      operation: 'select';
      table: TableName;
      actor: ActorName;
      target: FixtureName;
      expected: Outcome;
      why: string;
    }
  | {
      operation: 'delete';
      table: TableName;
      actor: ActorName;
      target: FixtureName;
      expected: Outcome;
      why: string;
    }
  | {
      operation: 'insert';
      table: TableName;
      actor: ActorName;
      values: (fixtures: Fixtures) => Values;
      expected: Outcome;
      why: string;
    }
  | {
      operation: 'update';
      table: TableName;
      actor: ActorName;
      target: FixtureName;
      values: (fixtures: Fixtures) => Values;
      expected: Outcome;
      why: string;
    }
  | {
      operation: 'rpc';
      table: string; // el nombre de la función
      schema: 'public' | 'private';
      actor: ActorName;
      values: (fixtures: Fixtures) => Values;
      expected: Outcome;
      why: string;
    };

// texto distinto en cada corrida, para que un cambio permitido siempre cambie algo
const runText = `Matriz ${Date.now()}`;

function newPost(): Values {
  return { title: 'Matriz: nueva', content: runText };
}

function replyTo(fixture: FixtureName): (fixtures: Fixtures) => Values {
  return (fixtures) => ({ post_id: fixtures[fixture], content: runText });
}

function reportPost(fixture: FixtureName): (fixtures: Fixtures) => Values {
  return (fixtures) => ({ post_id: fixtures[fixture], reason: 'spam' });
}

const postsCases: MatrixCase[] = [
  { operation: 'select', table: 'posts', actor: 'anon', target: 'memberPost', expected: 'denied', why: 'sin sesión no se lee el foro' },
  { operation: 'select', table: 'posts', actor: 'newcomer', target: 'memberPost', expected: 'allowed', why: 'se lee sin haber aceptado las reglas' },
  { operation: 'select', table: 'posts', actor: 'stranger', target: 'memberPost', expected: 'allowed', why: 'cualquier sesión lee lo visible' },
  { operation: 'select', table: 'posts', actor: 'suspended', target: 'memberPost', expected: 'allowed', why: 'una suspensión no quita la lectura' },
  { operation: 'select', table: 'posts', actor: 'banned', target: 'memberPost', expected: 'allowed', why: 'un baneo no quita la lectura' },
  { operation: 'select', table: 'posts', actor: 'stranger', target: 'hiddenPost', expected: 'noEffect', why: 'lo oculto no lo ve nadie más' },
  { operation: 'select', table: 'posts', actor: 'member', target: 'hiddenPost', expected: 'allowed', why: 'el autor ve su publicación oculta' },
  { operation: 'select', table: 'posts', actor: 'stranger', target: 'deletedPost', expected: 'noEffect', why: 'lo borrado no lo ve nadie más' },
  { operation: 'select', table: 'posts', actor: 'member', target: 'deletedPost', expected: 'allowed', why: 'el autor todavía lee su publicación borrada' },

  { operation: 'insert', table: 'posts', actor: 'anon', values: newPost, expected: 'denied', why: 'sin sesión no se publica' },
  { operation: 'insert', table: 'posts', actor: 'newcomer', values: newPost, expected: 'denied', why: 'sin aceptar las reglas no se publica' },
  { operation: 'insert', table: 'posts', actor: 'noDevice', values: newPost, expected: 'denied', why: 'sin teléfono registrado no se publica' },
  { operation: 'insert', table: 'posts', actor: 'suspended', values: newPost, expected: 'denied', why: 'suspendido no publica' },
  { operation: 'insert', table: 'posts', actor: 'banned', values: newPost, expected: 'denied', why: 'baneado no publica' },
  { operation: 'insert', table: 'posts', actor: 'member', values: (f) => ({ ...newPost(), author_id: f.strangerProfile }), expected: 'denied', why: 'no se publica a nombre de otra persona' },
  { operation: 'insert', table: 'posts', actor: 'member', values: () => ({ ...newPost(), status: 'hidden' }), expected: 'denied', why: 'el estado no lo elige quien publica' },
  { operation: 'insert', table: 'posts', actor: 'member', values: () => ({ ...newPost(), created_at: '2000-01-01T00:00:00Z' }), expected: 'denied', why: 'la fecha no se elige (saltaría el límite por minuto)' },
  { operation: 'insert', table: 'posts', actor: 'member', values: newPost, expected: 'allowed', why: 'un miembro publica' },

  { operation: 'update', table: 'posts', actor: 'anon', target: 'memberPost', values: () => ({ content: runText }), expected: 'denied', why: 'sin sesión no se edita' },
  { operation: 'update', table: 'posts', actor: 'newcomer', target: 'memberPost', values: () => ({ content: runText }), expected: 'noEffect', why: 'no se edita lo ajeno (recién llegado)' },
  { operation: 'update', table: 'posts', actor: 'stranger', target: 'memberPost', values: () => ({ content: runText }), expected: 'noEffect', why: 'no se edita lo ajeno' },
  { operation: 'update', table: 'posts', actor: 'stranger', target: 'memberPost', values: () => ({ deleted_at: new Date().toISOString() }), expected: 'noEffect', why: 'no se borra lo ajeno' },
  { operation: 'update', table: 'posts', actor: 'member', target: 'memberPost', values: (f) => ({ author_id: f.strangerProfile }), expected: 'denied', why: 'no se cambia el autor' },
  { operation: 'update', table: 'posts', actor: 'member', target: 'hiddenPost', values: () => ({ status: 'visible' }), expected: 'denied', why: 'el autor no saca su publicación de oculta' },
  { operation: 'update', table: 'posts', actor: 'member', target: 'memberPost', values: () => ({ created_at: '2000-01-01T00:00:00Z' }), expected: 'denied', why: 'no se cambia la fecha de creación' },
  { operation: 'update', table: 'posts', actor: 'member', target: 'memberPost', values: () => ({ edited_at: null }), expected: 'denied', why: 'no se borra la marca de editado' },
  { operation: 'update', table: 'posts', actor: 'member', target: 'hiddenPost', values: () => ({ content: runText }), expected: 'noEffect', why: 'lo oculto no se edita' },
  { operation: 'update', table: 'posts', actor: 'member', target: 'deletedPost', values: () => ({ content: runText }), expected: 'noEffect', why: 'lo borrado no se edita' },
  { operation: 'update', table: 'posts', actor: 'member', target: 'deletedPost', values: () => ({ deleted_at: null }), expected: 'noEffect', why: 'lo borrado no se recupera' },
  { operation: 'update', table: 'posts', actor: 'noDevice', target: 'noDevicePost', values: () => ({ content: runText }), expected: 'denied', why: 'sin teléfono no se edita ni lo propio' },
  { operation: 'update', table: 'posts', actor: 'suspended', target: 'suspendedPost', values: () => ({ content: runText }), expected: 'denied', why: 'suspendido no edita lo propio' },
  { operation: 'update', table: 'posts', actor: 'suspended', target: 'suspendedPost', values: () => ({ deleted_at: new Date().toISOString() }), expected: 'denied', why: 'suspendido no borra lo propio' },
  { operation: 'update', table: 'posts', actor: 'banned', target: 'bannedPost', values: () => ({ content: runText }), expected: 'denied', why: 'baneado no edita lo propio' },
  { operation: 'update', table: 'posts', actor: 'member', target: 'memberPost', values: () => ({ title: `${runText} título` }), expected: 'allowed', why: 'el autor edita el título' },
  { operation: 'update', table: 'posts', actor: 'member', target: 'memberPost', values: () => ({ content: runText }), expected: 'allowed', why: 'el autor edita el texto' },
  { operation: 'update', table: 'posts', actor: 'member', target: 'memberPostToDelete', values: () => ({ deleted_at: new Date().toISOString() }), expected: 'allowed', why: 'el autor borra lo suyo' },

  { operation: 'delete', table: 'posts', actor: 'anon', target: 'memberPost', expected: 'denied', why: 'sin sesión no se borra' },
  { operation: 'delete', table: 'posts', actor: 'stranger', target: 'memberPost', expected: 'denied', why: 'nadie borra la fila de verdad' },
  { operation: 'delete', table: 'posts', actor: 'member', target: 'memberPost', expected: 'denied', why: 'ni el autor: se borra marcando deleted_at' },
];

const commentsCases: MatrixCase[] = [
  { operation: 'select', table: 'comments', actor: 'anon', target: 'memberComment', expected: 'denied', why: 'sin sesión no se leen respuestas' },
  { operation: 'select', table: 'comments', actor: 'newcomer', target: 'memberComment', expected: 'allowed', why: 'se leen sin haber aceptado las reglas' },
  { operation: 'select', table: 'comments', actor: 'stranger', target: 'memberComment', expected: 'allowed', why: 'cualquier sesión lee lo visible' },
  { operation: 'select', table: 'comments', actor: 'stranger', target: 'hiddenComment', expected: 'noEffect', why: 'una respuesta oculta no la ve nadie más' },
  { operation: 'select', table: 'comments', actor: 'member', target: 'hiddenComment', expected: 'allowed', why: 'el autor ve su respuesta oculta' },
  { operation: 'select', table: 'comments', actor: 'stranger', target: 'commentOnHiddenPost', expected: 'noEffect', why: 'las respuestas de algo oculto tampoco se ven' },
  { operation: 'select', table: 'comments', actor: 'member', target: 'commentOnHiddenPost', expected: 'allowed', why: 'el autor ve su respuesta aunque la publicación esté oculta' },

  { operation: 'insert', table: 'comments', actor: 'anon', values: replyTo('memberPost'), expected: 'denied', why: 'sin sesión no se responde' },
  { operation: 'insert', table: 'comments', actor: 'newcomer', values: replyTo('memberPost'), expected: 'denied', why: 'sin aceptar las reglas no se responde' },
  { operation: 'insert', table: 'comments', actor: 'noDevice', values: replyTo('memberPost'), expected: 'denied', why: 'sin teléfono registrado no se responde' },
  { operation: 'insert', table: 'comments', actor: 'suspended', values: replyTo('memberPost'), expected: 'denied', why: 'suspendido no responde' },
  { operation: 'insert', table: 'comments', actor: 'banned', values: replyTo('memberPost'), expected: 'denied', why: 'baneado no responde' },
  { operation: 'insert', table: 'comments', actor: 'member', values: replyTo('hiddenPost'), expected: 'denied', why: 'no se responde a algo oculto' },
  { operation: 'insert', table: 'comments', actor: 'member', values: replyTo('deletedPost'), expected: 'denied', why: 'no se responde a algo borrado' },
  { operation: 'insert', table: 'comments', actor: 'member', values: (f) => ({ ...replyTo('memberPost')(f), author_id: f.strangerProfile }), expected: 'denied', why: 'no se responde a nombre de otra persona' },
  { operation: 'insert', table: 'comments', actor: 'member', values: (f) => ({ ...replyTo('memberPost')(f), created_at: '2000-01-01T00:00:00Z' }), expected: 'denied', why: 'la fecha no se elige' },
  { operation: 'insert', table: 'comments', actor: 'member', values: replyTo('memberPost'), expected: 'allowed', why: 'el autor responde en lo suyo' },
  { operation: 'insert', table: 'comments', actor: 'stranger', values: replyTo('memberPost'), expected: 'allowed', why: 'otro miembro responde' },

  { operation: 'update', table: 'comments', actor: 'anon', target: 'memberComment', values: () => ({ content: runText }), expected: 'denied', why: 'sin sesión no se edita' },
  { operation: 'update', table: 'comments', actor: 'stranger', target: 'memberComment', values: () => ({ content: runText }), expected: 'noEffect', why: 'no se edita lo ajeno' },
  { operation: 'update', table: 'comments', actor: 'stranger', target: 'memberComment', values: () => ({ deleted_at: new Date().toISOString() }), expected: 'noEffect', why: 'no se borra lo ajeno' },
  { operation: 'update', table: 'comments', actor: 'member', target: 'memberComment', values: (f) => ({ post_id: f.strangerPost }), expected: 'denied', why: 'una respuesta no se mueve a otra publicación' },
  { operation: 'update', table: 'comments', actor: 'member', target: 'hiddenComment', values: () => ({ status: 'visible' }), expected: 'denied', why: 'el autor no saca su respuesta de oculta' },
  { operation: 'update', table: 'comments', actor: 'member', target: 'hiddenComment', values: () => ({ content: runText }), expected: 'noEffect', why: 'lo oculto no se edita' },
  { operation: 'update', table: 'comments', actor: 'suspended', target: 'suspendedComment', values: () => ({ content: runText }), expected: 'denied', why: 'suspendido no edita lo propio' },
  { operation: 'update', table: 'comments', actor: 'member', target: 'memberComment', values: () => ({ content: runText }), expected: 'allowed', why: 'el autor edita su respuesta' },
  { operation: 'update', table: 'comments', actor: 'member', target: 'memberCommentToDelete', values: () => ({ deleted_at: new Date().toISOString() }), expected: 'allowed', why: 'el autor borra su respuesta' },

  { operation: 'delete', table: 'comments', actor: 'member', target: 'memberComment', expected: 'denied', why: 'ni el autor borra la fila de verdad' },
];

// el historial de versiones lo escriben los triggers; se ve si se ve la publicación o respuesta
const editsCases: MatrixCase[] = [
  { operation: 'select', table: 'post_edits', actor: 'anon', target: 'memberPost', expected: 'denied', why: 'sin sesión no se ve el historial' },
  { operation: 'select', table: 'post_edits', actor: 'stranger', target: 'memberPost', expected: 'allowed', why: 'se ve el historial de lo visible' },
  { operation: 'select', table: 'post_edits', actor: 'stranger', target: 'hiddenPost', expected: 'noEffect', why: 'no se ve el historial de lo oculto' },
  { operation: 'select', table: 'post_edits', actor: 'member', target: 'hiddenPost', expected: 'allowed', why: 'el autor ve el historial de lo suyo' },
  { operation: 'insert', table: 'post_edits', actor: 'member', values: (f) => ({ post_id: f.memberPost, title: 'Falsa', content: runText, written_at: '2000-01-01T00:00:00Z' }), expected: 'denied', why: 'nadie inventa versiones' },
  { operation: 'update', table: 'post_edits', actor: 'member', target: 'memberPost', values: () => ({ content: runText }), expected: 'denied', why: 'nadie reescribe versiones' },
  { operation: 'delete', table: 'post_edits', actor: 'member', target: 'memberPost', expected: 'denied', why: 'nadie borra versiones' },

  { operation: 'select', table: 'comment_edits', actor: 'anon', target: 'memberComment', expected: 'denied', why: 'sin sesión no se ve el historial' },
  { operation: 'select', table: 'comment_edits', actor: 'stranger', target: 'memberComment', expected: 'allowed', why: 'se ve el historial de lo visible' },
  { operation: 'select', table: 'comment_edits', actor: 'stranger', target: 'hiddenComment', expected: 'noEffect', why: 'no se ve el historial de lo oculto' },
  { operation: 'select', table: 'comment_edits', actor: 'member', target: 'hiddenComment', expected: 'allowed', why: 'el autor ve el historial de lo suyo' },
  { operation: 'insert', table: 'comment_edits', actor: 'member', values: (f) => ({ comment_id: f.memberComment, content: runText, written_at: '2000-01-01T00:00:00Z' }), expected: 'denied', why: 'nadie inventa versiones' },
  { operation: 'delete', table: 'comment_edits', actor: 'member', target: 'memberComment', expected: 'denied', why: 'nadie borra versiones' },
];

const reportsCases: MatrixCase[] = [
  { operation: 'select', table: 'reports', actor: 'member', target: 'memberPost', expected: 'denied', why: 'nadie ve quién reportó' },
  { operation: 'select', table: 'reports', actor: 'stranger', target: 'memberPost', expected: 'denied', why: 'ni quien reportó lee los reportes' },

  { operation: 'insert', table: 'reports', actor: 'anon', values: reportPost('strangerPost'), expected: 'denied', why: 'sin sesión no se reporta' },
  { operation: 'insert', table: 'reports', actor: 'newcomer', values: reportPost('strangerPost'), expected: 'denied', why: 'sin aceptar las reglas no se reporta' },
  { operation: 'insert', table: 'reports', actor: 'noDevice', values: reportPost('strangerPost'), expected: 'denied', why: 'sin teléfono registrado no se reporta' },
  { operation: 'insert', table: 'reports', actor: 'suspended', values: reportPost('strangerPost'), expected: 'denied', why: 'suspendido no reporta' },
  { operation: 'insert', table: 'reports', actor: 'banned', values: reportPost('strangerPost'), expected: 'denied', why: 'baneado no reporta' },
  { operation: 'insert', table: 'reports', actor: 'member', values: reportPost('memberPost'), expected: 'denied', why: 'no se reporta lo propio' },
  { operation: 'insert', table: 'reports', actor: 'stranger', values: reportPost('hiddenPost'), expected: 'denied', why: 'no se reporta lo oculto' },
  { operation: 'insert', table: 'reports', actor: 'stranger', values: reportPost('deletedPost'), expected: 'denied', why: 'no se reporta lo borrado' },
  { operation: 'insert', table: 'reports', actor: 'member', values: (f) => ({ ...reportPost('strangerPost')(f), reporter_id: f.strangerProfile }), expected: 'denied', why: 'no se reporta a nombre de otra persona' },
  { operation: 'insert', table: 'reports', actor: 'member', values: reportPost('strangerPost'), expected: 'allowed', why: 'un miembro reporta una publicación ajena' },
  { operation: 'insert', table: 'reports', actor: 'stranger', values: (f) => ({ comment_id: f.memberComment, reason: 'acoso' }), expected: 'allowed', why: 'un miembro reporta una respuesta ajena' },

  { operation: 'update', table: 'reports', actor: 'stranger', target: 'memberPost', values: () => ({ reason: 'otro' }), expected: 'denied', why: 'un reporte no se cambia' },
  { operation: 'delete', table: 'reports', actor: 'stranger', target: 'memberPost', expected: 'denied', why: 'un reporte no se retira' },
];

const noticesCases: MatrixCase[] = [
  { operation: 'select', table: 'moderation_notices', actor: 'anon', target: 'memberNotice', expected: 'denied', why: 'sin sesión no se ven avisos' },
  { operation: 'select', table: 'moderation_notices', actor: 'stranger', target: 'memberNotice', expected: 'noEffect', why: 'los avisos de otra persona no se ven' },
  { operation: 'select', table: 'moderation_notices', actor: 'member', target: 'memberNotice', expected: 'allowed', why: 'cada quien ve sus avisos' },

  { operation: 'insert', table: 'moderation_notices', actor: 'member', values: (f) => ({ user_id: f.strangerProfile, post_id: f.strangerPost, category: 'spam', message: runText, excerpt: 'x' }), expected: 'denied', why: 'solo moderación crea avisos' },
  { operation: 'update', table: 'moderation_notices', actor: 'stranger', target: 'memberNotice', values: () => ({ seen_at: new Date().toISOString() }), expected: 'noEffect', why: 'no se marcan como vistos avisos ajenos' },
  { operation: 'update', table: 'moderation_notices', actor: 'member', target: 'memberNotice', values: () => ({ counts_as_warning: false }), expected: 'denied', why: 'una advertencia no se quita sola' },
  { operation: 'update', table: 'moderation_notices', actor: 'member', target: 'memberNotice', values: () => ({ withdrawn_at: new Date().toISOString() }), expected: 'denied', why: 'un aviso no se retira solo' },
  { operation: 'update', table: 'moderation_notices', actor: 'member', target: 'memberNotice', values: () => ({ message: runText }), expected: 'denied', why: 'el mensaje no se cambia' },
  { operation: 'update', table: 'moderation_notices', actor: 'member', target: 'memberNotice', values: () => ({ seen_at: new Date().toISOString() }), expected: 'allowed', why: 'cada quien marca sus avisos como vistos' },
  { operation: 'delete', table: 'moderation_notices', actor: 'member', target: 'memberNotice', expected: 'denied', why: 'un aviso no se borra' },
];

const profilesCases: MatrixCase[] = [
  { operation: 'select', table: 'profiles', actor: 'anon', target: 'memberProfile', expected: 'denied', why: 'sin sesión no se ven alias' },
  { operation: 'select', table: 'profiles', actor: 'newcomer', target: 'memberProfile', expected: 'allowed', why: 'el alias y el color se ven junto a cada publicación' },
  { operation: 'select', table: 'profiles', actor: 'stranger', target: 'memberProfile', expected: 'allowed', why: 'cualquier sesión ve alias y color' },

  { operation: 'insert', table: 'profiles', actor: 'member', values: () => ({ display_name: 'falso-perfil' }), expected: 'denied', why: 'los perfiles los crea el trigger' },
  { operation: 'update', table: 'profiles', actor: 'stranger', target: 'memberProfile', values: () => ({ color: '#d2a08a' }), expected: 'noEffect', why: 'no se cambia el color de otra persona' },
  { operation: 'update', table: 'profiles', actor: 'member', target: 'memberProfile', values: () => ({ display_name: 'otro-alias' }), expected: 'denied', why: 'el alias no se elige' },
  { operation: 'update', table: 'profiles', actor: 'member', target: 'memberProfile', values: () => ({ color: '#8aaad2' }), expected: 'allowed', why: 'cada quien elige su color' },
  { operation: 'delete', table: 'profiles', actor: 'member', target: 'memberProfile', expected: 'denied', why: 'un perfil no se borra desde la app' },

  { operation: 'select', table: 'profile_private', actor: 'anon', target: 'memberProfile', expected: 'denied', why: 'sin sesión no se ven fechas' },
  { operation: 'select', table: 'profile_private', actor: 'stranger', target: 'memberProfile', expected: 'noEffect', why: 'las fechas de otra persona no se ven' },
  { operation: 'select', table: 'profile_private', actor: 'member', target: 'memberProfile', expected: 'allowed', why: 'cada quien ve sus fechas' },
  { operation: 'insert', table: 'profile_private', actor: 'member', values: (f) => ({ user_id: f.memberProfile }), expected: 'denied', why: 'la fila privada la crea el trigger' },
  { operation: 'update', table: 'profile_private', actor: 'stranger', target: 'memberProfile', values: () => ({ rules_accepted_at: null }), expected: 'noEffect', why: 'no se tocan las fechas de otra persona' },
  { operation: 'update', table: 'profile_private', actor: 'member', target: 'memberProfile', values: () => ({ created_at: '2000-01-01T00:00:00Z' }), expected: 'denied', why: 'la antigüedad de la cuenta no se cambia' },
  { operation: 'update', table: 'profile_private', actor: 'member', target: 'memberProfile', values: () => ({ rules_accepted_at: '2000-01-01T00:00:00Z' }), expected: 'noEffect', why: 'la hora de aceptar las reglas la fija el servidor una vez' },
  { operation: 'delete', table: 'profile_private', actor: 'member', target: 'memberProfile', expected: 'denied', why: 'la fila privada no se borra' },
];

const devicesCases: MatrixCase[] = [
  { operation: 'select', table: 'user_devices', actor: 'anon', target: 'memberProfile', expected: 'denied', why: 'sin sesión no se ven teléfonos' },
  { operation: 'select', table: 'user_devices', actor: 'stranger', target: 'memberProfile', expected: 'noEffect', why: 'los teléfonos de otra persona no se ven' },
  { operation: 'select', table: 'user_devices', actor: 'member', target: 'memberProfile', expected: 'allowed', why: 'cada quien ve sus teléfonos' },
  { operation: 'insert', table: 'user_devices', actor: 'anon', values: () => ({ device_id: `${runText} anon`, platform: 'android' }), expected: 'denied', why: 'sin sesión no se registra un teléfono' },
  { operation: 'insert', table: 'user_devices', actor: 'member', values: (f) => ({ user_id: f.strangerProfile, device_id: `${runText} ajeno`, platform: 'android' }), expected: 'denied', why: 'no se registra un teléfono a nombre de otra persona' },
  { operation: 'insert', table: 'user_devices', actor: 'member', values: () => ({ device_id: `${runText} extra`, platform: 'ios' }), expected: 'allowed', why: 'cada quien registra sus teléfonos' },
  { operation: 'update', table: 'user_devices', actor: 'member', target: 'memberProfile', values: () => ({ device_id: `${runText} cambiado` }), expected: 'denied', why: 'un teléfono registrado no se cambia (esquivaría un baneo)' },
  { operation: 'delete', table: 'user_devices', actor: 'member', target: 'memberProfile', expected: 'denied', why: 'un teléfono registrado no se borra (esquivaría un baneo)' },
];

// argumentos con la forma correcta: así el "no" viene del permiso y no de una firma equivocada
const moderationTarget = { moderator_id: 1, target_post_id: 1, target_comment_id: null };

const rpcCases: MatrixCase[] = [
  { operation: 'rpc', table: 'get_my_active_ban', schema: 'public', actor: 'anon', values: () => ({}), expected: 'denied', why: 'sin sesión no hay baneo que consultar' },
  { operation: 'rpc', table: 'get_my_active_ban', schema: 'public', actor: 'member', values: () => ({}), expected: 'allowed', why: 'cada quien consulta su baneo' },
  { operation: 'rpc', table: 'get_my_active_ban', schema: 'public', actor: 'suspended', values: () => ({}), expected: 'allowed', why: 'quien está suspendido ve hasta cuándo' },
  { operation: 'rpc', table: 'audit_api_surface', schema: 'public', actor: 'member', values: () => ({}), expected: 'denied', why: 'la auditoría es solo para las pruebas' },
  { operation: 'rpc', table: 'mod_whoami', schema: 'public', actor: 'anon', values: () => ({ token: 'x' }), expected: 'denied', why: 'sin sesión no se prueba un token de moderación' },
  { operation: 'rpc', table: 'mod_whoami', schema: 'public', actor: 'member', values: () => ({ token: 'x' }), expected: 'denied', why: 'una sesión no prueba tokens de moderación' },
  { operation: 'rpc', table: 'mod_list_pending', schema: 'public', actor: 'member', values: () => ({ max_items: 5 }), expected: 'denied', why: 'una sesión no ve la cola de moderación' },
  { operation: 'rpc', table: 'mod_summary', schema: 'public', actor: 'member', values: () => ({ since: '2000-01-01T00:00:00Z' }), expected: 'denied', why: 'una sesión no ve el resumen de moderación' },
  { operation: 'rpc', table: 'mod_get_content', schema: 'public', actor: 'member', values: () => ({ target_post_id: 1, target_comment_id: null }), expected: 'denied', why: 'una sesión no lee contenido oculto por moderación' },
  { operation: 'rpc', table: 'mod_get_author', schema: 'public', actor: 'member', values: () => ({ alias: 'algo-raro' }), expected: 'denied', why: 'una sesión no ve el historial de otra persona' },
  { operation: 'rpc', table: 'mod_hide', schema: 'public', actor: 'member', values: () => ({ ...moderationTarget, category: 'spam', message: 'x' }), expected: 'denied', why: 'una sesión no oculta nada' },
  { operation: 'rpc', table: 'mod_restore', schema: 'public', actor: 'member', values: () => ({ ...moderationTarget, note: 'x' }), expected: 'denied', why: 'una sesión no restaura nada' },
  { operation: 'rpc', table: 'mod_mark_reviewed', schema: 'public', actor: 'member', values: () => ({ ...moderationTarget, note: 'x' }), expected: 'denied', why: 'una sesión no cierra pendientes' },
  { operation: 'rpc', table: 'mod_ban', schema: 'public', actor: 'member', values: () => ({ moderator_id: 1, alias: 'algo-raro', reason: 'x', hours: 1 }), expected: 'denied', why: 'una sesión no banea' },
  { operation: 'rpc', table: 'mod_unban', schema: 'public', actor: 'banned', values: () => ({ moderator_id: 1, alias: 'algo-raro', note: 'x' }), expected: 'denied', why: 'nadie se quita un baneo solo' },
  { operation: 'rpc', table: 'can_write', schema: 'private', actor: 'member', values: () => ({}), expected: 'denied', why: 'el esquema private no se expone' },
  { operation: 'rpc', table: 'my_active_ban', schema: 'private', actor: 'member', values: () => ({}), expected: 'denied', why: 'las funciones internas no se llaman desde la app' },
];

export const matrixCases: MatrixCase[] = [
  ...postsCases,
  ...commentsCases,
  ...editsCases,
  ...reportsCases,
  ...noticesCases,
  ...profilesCases,
  ...devicesCases,
  ...rpcCases,
];
