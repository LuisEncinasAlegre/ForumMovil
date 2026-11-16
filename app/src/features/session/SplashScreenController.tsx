import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

// La pantalla de carga del sistema se queda hasta saber a dónde mandar al usuario.
SplashScreen.preventAutoHideAsync();

type SplashScreenControllerProps = {
  isReady: boolean;
};

export function SplashScreenController({ isReady }: SplashScreenControllerProps) {
  useEffect(() => {
    if (isReady) {
      SplashScreen.hide();
    }
  }, [isReady]);

  return null;
}
