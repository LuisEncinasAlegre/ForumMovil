import { useQuery, useQueryClient } from '@tanstack/react-query';

import { registerDevice } from './api';
import { getDeviceInfo } from './deviceId';

// Registra este teléfono para la cuenta. La base pide un teléfono registrado para escribir.
// Es una consulta y no una mutación para que, si falla (sin red), TanStack Query lo vuelva a
// intentar solo al volver a la app y cuando una escritura falla por permisos (query-client.ts).
// Registrar dos veces no hace nada (upsert), así que repetirlo es seguro.
export function useRegisterDevice(userId: string | null): void {
  const queryClient = useQueryClient();

  useQuery({
    queryKey: ['device', userId],
    queryFn: async () => {
      const device = await getDeviceInfo();
      // sin identificador (web, o iOS antes de desbloquear) no se registra; escribir queda bloqueado
      if (!device) {
        return false;
      }
      await registerDevice(device);
      // un teléfono ya baneado por otra cuenta te alcanza desde ahora: que la app lo sepa ya
      await queryClient.invalidateQueries({ queryKey: ['ban'] });
      return true;
    },
    enabled: userId !== null,
    // registrado una vez, no hace falta repetirlo en esta sesión de la app
    staleTime: Infinity,
    retry: 2,
  });
}
