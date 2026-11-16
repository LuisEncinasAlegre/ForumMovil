import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { registerDevice } from './api';
import { getDeviceInfo } from './deviceId';

async function registerThisDevice(): Promise<void> {
  const device = await getDeviceInfo();
  // sin identificador (web, o iOS antes de desbloquear) no se registra; escribir queda bloqueado
  if (!device) {
    return;
  }
  await registerDevice(device);
}

// Registra este teléfono una vez por cuenta y por arranque de la app. La base pide un teléfono
// registrado para escribir: si esto falla, escribir da error de permisos y la próxima vez que
// abras la app se vuelve a intentar.
export function useRegisterDevice(userId: string | null): void {
  const { mutate } = useMutation({ mutationFn: registerThisDevice, retry: 2 });
  const registeredUserId = useRef<string | null>(null);

  useEffect(() => {
    if (userId === null || registeredUserId.current === userId) {
      return;
    }
    registeredUserId.current = userId;
    mutate();
  }, [userId, mutate]);
}
