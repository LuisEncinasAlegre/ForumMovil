import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
  useFonts,
} from '@expo-google-fonts/ibm-plex-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SessionProvider } from '@/features/session/SessionProvider';
import { SplashScreenController } from '@/features/session/SplashScreenController';
import { useMyProfile } from '@/features/session/useMyProfile';
import { useSession } from '@/features/session/useSession';
import { queryClient, useAppStateFocus } from '@/lib/query-client';
import { colors } from '@/theme/tokens';

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
        <StatusBar style="light" />
        <RootNavigator />
      </SessionProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { session, isLoading } = useSession();
  const profileQuery = useMyProfile();

  const isReady = !isLoading && (!session || !profileQuery.isPending);
  const isInForum = !!session && !!profileQuery.data?.rules_accepted_at;

  // hasta saber a dónde va, no mostramos ninguna pantalla (la splash sigue encima)
  if (!isReady) {
    return <SplashScreenController isReady={false} />;
  }

  return (
    <>
      <SplashScreenController isReady />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
        <Stack.Protected guard={isInForum}>
          <Stack.Screen name="index" />
        </Stack.Protected>
        <Stack.Protected guard={!isInForum}>
          <Stack.Screen name="bienvenida" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
