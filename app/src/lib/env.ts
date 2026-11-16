type Env = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

// Revisa que estén las variables del .env y avisa cuál falta.
export function readEnv(values: {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}): Env {
  if (!values.EXPO_PUBLIC_SUPABASE_URL) {
    throw new Error('Falta EXPO_PUBLIC_SUPABASE_URL en app/.env (cópialo de .env.example).');
  }
  if (!values.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Falta EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY en app/.env (cópialo de .env.example).');
  }
  return {
    supabaseUrl: values.EXPO_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: values.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}
