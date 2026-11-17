// Único archivo de la sesión que habla con Supabase. Si Supabase devuelve error, lo lanzamos.
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

import type { Profile } from './types';

export async function startAnonymousSession(): Promise<Session> {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw error;
  }
  if (!data.session) {
    throw new Error('Supabase no devolvió una sesión.');
  }
  return data.session;
}

// Avisa cada vez que cambia la sesión. La primera llamada trae la sesión guardada en el teléfono
// (o null si no hay). Devuelve la función para dejar de escuchar.
export function onSessionChange(callback: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    // no llamar otras funciones de Supabase aquí adentro: puede bloquear el cliente
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}

// La fila de profile_private viene en la misma consulta (relación uno a uno con profiles).
const MY_PROFILE_COLUMNS = 'id, display_name, color, profile_private(rules_accepted_at)';

type MyProfileRow = {
  id: string;
  display_name: string;
  color: string | null;
  profile_private: { rules_accepted_at: string | null } | null;
};

function toProfile(row: MyProfileRow): Profile {
  return {
    id: row.id,
    display_name: row.display_name,
    color: row.color,
    rules_accepted_at: row.profile_private?.rules_accepted_at ?? null,
  };
}

// null si el perfil ya no existe (por ejemplo, borraron al usuario anónimo).
export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select(MY_PROFILE_COLUMNS).eq('id', userId).maybeSingle();
  if (error) {
    throw error;
  }
  return data ? toProfile(data) : null;
}

export async function acceptRules(userId: string): Promise<Profile> {
  // El valor que mandamos no importa: un trigger lo cambia por la hora del servidor.
  // Con .single(), si RLS no encuentra tu fila es un error y no un "0 filas" silencioso.
  const { error } = await supabase
    .from('profile_private')
    .update({ rules_accepted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('rules_accepted_at')
    .single();
  if (error) {
    throw error;
  }
  const profile = await fetchMyProfile(userId);
  if (!profile) {
    throw new Error('Tu perfil ya no existe.');
  }
  return profile;
}

// El formato (#rrggbb en minúsculas) lo revisa la base de datos.
export async function updateMyColor(userId: string, color: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ color })
    .eq('id', userId)
    .select(MY_PROFILE_COLUMNS)
    .single();
  if (error) {
    throw error;
  }
  return toProfile(data);
}

// Borra la sesión solo de este teléfono (el usuario ya no existe en el servidor).
export async function forgetSession(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) {
    throw error;
  }
}
