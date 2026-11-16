import type { Tables } from '@/lib/database.types';

// restriction es un campo calculado: no viene en select('*'), solo si se pide por nombre.
export type Profile = Omit<Tables<'profiles'>, 'restriction'>;
