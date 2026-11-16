import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { DeviceInfo } from './types';

const IOS_DEVICE_ID_KEY = 'forummovil.device-id';
const SECURE_STORE_OPTIONS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

// En iOS el identificador de proveedor cambia al reinstalar la app. Lo guardamos en el llavero,
// que suele sobrevivir a la reinstalación (Expo no lo promete), y la próxima vez leemos ese.
export async function readOrSaveIosDeviceId(): Promise<string | null> {
  const savedDeviceId = await SecureStore.getItemAsync(IOS_DEVICE_ID_KEY, SECURE_STORE_OPTIONS);
  if (savedDeviceId) {
    return savedDeviceId;
  }
  // puede ser null justo después de reiniciar el teléfono, antes de desbloquearlo
  const vendorId = await Application.getIosIdForVendorAsync();
  if (!vendorId) {
    return null;
  }
  await SecureStore.setItemAsync(IOS_DEVICE_ID_KEY, vendorId, SECURE_STORE_OPTIONS);
  return vendorId;
}

// null = no se pudo esta vez; se intenta de nuevo la próxima vez que abras la app.
// En web siempre es null: la app es para teléfonos y en web no se puede escribir.
export async function getDeviceInfo(): Promise<DeviceInfo | null> {
  if (Platform.OS === 'android') {
    return { deviceId: Application.getAndroidId(), platform: 'android' };
  }
  if (Platform.OS === 'ios') {
    const deviceId = await readOrSaveIosDeviceId();
    return deviceId ? { deviceId, platform: 'ios' } : null;
  }
  return null;
}
