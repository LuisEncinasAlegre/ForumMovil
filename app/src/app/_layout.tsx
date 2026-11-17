import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
  useFonts,
} from '@expo-google-fonts/ibm-plex-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useRegisterDevice } from '@/features/moderation/useRegisterDevice';
import { SessionProvider } from '@/features/session/SessionProvider';
import { SplashScreenController } from '@/features/session/SplashScreenController';
import { useMyProfile } from '@/features/session/useMyProfile';
import { useSession } from '@/features/session/useSession';
import { queryClient, useAppStateFocus } from '@/lib/query-client';
import { colors } from '@/theme/tokens';

// Tema del navegador con nuestros colores. Sin esto, React Navigation usa su fondo claro y se ve
// un destello blanco detrás de las pantallas al entrar o volver.
const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.paper,
    card: colors.paper,
    text: colors.ink,
    border: colors.line,
    notification: colors.accent,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
  });
  useAppStateFocus();

  // si las fuentes fallan seguimos con la del sistema; la splash sigue visible mientras cargan
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { session, isLoading } = useSession();
  const profileQuery = useMyProfile();
  useRegisterDevice(session?.user.id ?? null);

  const isReady = !isLoading && (!session || !profileQuery.isPending);
  const isInForum = !!session && !!profileQuery.data?.rules_accepted_at;

  // hasta saber a dónde va, no mostramos ninguna pantalla (la splash sigue encima)
  if (!isReady) {
    return <SplashScreenController isReady={false} />;
  }

  return (
    <>
      <SplashScreenController isReady />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
          // la misma entrada lateral en Android que en iOS
          animation: 'slide_from_right',
        }}>
        <Stack.Protected guard={isInForum}>
          <Stack.Screen name="index" />
          {/* sin gesto para cerrar: así no se pierde un borrador (usePreventRemove es del SDK 58) */}
          <Stack.Screen name="escribir" options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: false }} />
          <Stack.Screen name="hilo/[id]" />
          <Stack.Screen
            name="ediciones"
            options={{ presentation: 'formSheet', sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true }}
          />
          <Stack.Screen
            name="respuesta-ediciones"
            options={{ presentation: 'formSheet', sheetAllowedDetents: [0.6, 1], sheetGrabberVisible: true }}
          />
          <Stack.Screen name="perfil" />
          <Stack.Screen name="reglas" />
          <Stack.Screen name="privacidad" />
          <Stack.Screen name="suspendida" />
          <Stack.Screen
            name="reportar"
            options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true }}
          />
          <Stack.Screen
            name="aviso"
            options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!isInForum}>
          <Stack.Screen name="bienvenida" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
