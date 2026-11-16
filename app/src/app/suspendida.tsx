import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SuspendedNotice } from '@/features/moderation/SuspendedNotice';
import { useMyBan } from '@/features/moderation/useMyBan';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { BackButton } from '@/ui/BackButton';
import { Button } from '@/ui/Button';
import { Message } from '@/ui/Message';
import { Text } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';

// Por qué no puedes escribir (screens/suspendida.elyx). Se abre sola una vez y desde "Ver por qué".
export default function SuspendidaScreen() {
  const theme = useTheme();
  const { ban, isPending, isError, refetch } = useMyBan();

  function renderContent() {
    if (isPending) {
      return (
        <Text variant="ui" color="ink3" style={styles.loading} accessibilityLabel="Cargando">
          Cargando…
        </Text>
      );
    }
    if (isError) {
      return (
        <Message
          title="No pudimos revisar tu cuenta."
          body="Parece que no hay conexión. Revisa tu red y vuelve a intentarlo."
          actionLabel="Reintentar"
          onAction={refetch}
        />
      );
    }
    if (ban === null) {
      // se terminó o la quitaron mientras la pantalla estaba abierta
      return <Message title="Ya puedes escribir." body="Tu cuenta no tiene ninguna suspensión vigente." />;
    }
    return (
      <View style={styles.content}>
        <SuspendedNotice ban={ban} />
        <View style={styles.actions}>
          <Button label="Volver al foro" onPress={() => router.back()} />
          <Pressable accessibilityRole="link" hitSlop={space.s3} onPress={() => router.push('/reglas')}>
            <Text variant="ui" weight="medium" color="ink2">
              Ver reglas
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.paper }]} edges={['top', 'bottom']}>
      <TopBar left={<BackButton />} />
      <ScrollView>{renderContent()}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loading: {
    paddingHorizontal: space.gutter,
    paddingTop: space.s6,
  },
  content: {
    paddingTop: space.s3,
    paddingHorizontal: space.gutter,
    paddingBottom: space.s8,
    gap: space.s8,
  },
  actions: {
    alignItems: 'center',
    gap: space.s5,
  },
});
