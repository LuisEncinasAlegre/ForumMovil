// Perfiles de carga. "clase" supone unas 40 personas a la vez, cada una haciendo algo cada ~5 s
// (unas 8 vueltas por segundo). "estres" sube hasta 4 veces eso para ver dónde se rompe.
import type { Stage } from './scheduler.ts';

export type ProfileName = 'humo' | 'clase' | 'estres';

export type LoadProfile = {
  poolSize: number;
  stages: Stage[];
  // estres para solo si más del 5 % de las llamadas de los últimos 15 s fallan
  stopAtErrorRate: number;
};

export const LOAD_PROFILES: Record<ProfileName, LoadProfile> = {
  humo: {
    poolSize: 10,
    stages: [{ iterationsPerSecond: 1, seconds: 30 }],
    stopAtErrorRate: 0.05,
  },
  clase: {
    poolSize: 60,
    stages: [
      { iterationsPerSecond: 2, seconds: 60 },
      { iterationsPerSecond: 8, seconds: 180 },
    ],
    stopAtErrorRate: 0.05,
  },
  estres: {
    poolSize: 120,
    stages: [
      { iterationsPerSecond: 8, seconds: 60 },
      { iterationsPerSecond: 16, seconds: 60 },
      { iterationsPerSecond: 24, seconds: 60 },
      { iterationsPerSecond: 32, seconds: 60 },
    ],
    stopAtErrorRate: 0.05,
  },
};

export function isProfileName(value: string): value is ProfileName {
  return value === 'humo' || value === 'clase' || value === 'estres';
}
