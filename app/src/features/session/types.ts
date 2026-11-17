import type { Tables } from '@/lib/database.types';

// Tu perfil: alias y color (los ve cualquiera) y cuándo aceptaste las reglas, que vive en
// profile_private porque solo lo puedes leer tú. restriction (campo calculado) no va aquí.
export type Profile = Pick<Tables<'profiles'>, 'id' | 'display_name' | 'color'> & {
  rules_accepted_at: string | null;
};
