import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { getDeviceInfo } from '../deviceId';

jest.mock('expo-application', () => ({
  getAndroidId: jest.fn(),
  getIosIdForVendorAsync: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 0,
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

const mockedApplication = jest.mocked(Application);
const mockedSecureStore = jest.mocked(SecureStore);
const originalPlatform = Platform.OS;

function setPlatform(os: typeof Platform.OS): void {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

afterEach(() => {
  setPlatform(originalPlatform);
  jest.clearAllMocks();
});

describe('getDeviceInfo', () => {
  test('en Android usa el Android ID', async () => {
    setPlatform('android');
    mockedApplication.getAndroidId.mockReturnValue('a1b2c3d4e5f6');

    expect(await getDeviceInfo()).toEqual({ deviceId: 'a1b2c3d4e5f6', platform: 'android' });
  });

  test('en iOS usa el identificador guardado en el llavero', async () => {
    setPlatform('ios');
    mockedSecureStore.getItemAsync.mockResolvedValue('GUARDADO-1234');

    expect(await getDeviceInfo()).toEqual({ deviceId: 'GUARDADO-1234', platform: 'ios' });
    expect(mockedApplication.getIosIdForVendorAsync).not.toHaveBeenCalled();
  });

  test('en iOS, la primera vez guarda el identificador de proveedor', async () => {
    setPlatform('ios');
    mockedSecureStore.getItemAsync.mockResolvedValue(null);
    mockedApplication.getIosIdForVendorAsync.mockResolvedValue('IDFV-5678');

    expect(await getDeviceInfo()).toEqual({ deviceId: 'IDFV-5678', platform: 'ios' });
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('forummovil.device-id', 'IDFV-5678', {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  });

  test('en iOS sin identificador de proveedor devuelve null y no guarda nada', async () => {
    setPlatform('ios');
    mockedSecureStore.getItemAsync.mockResolvedValue(null);
    mockedApplication.getIosIdForVendorAsync.mockResolvedValue(null);

    expect(await getDeviceInfo()).toBeNull();
    expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  test('en web devuelve null', async () => {
    setPlatform('web');

    expect(await getDeviceInfo()).toBeNull();
  });
});
