import { Pressable, StyleSheet, View } from 'react-native';

import { SealMark } from '@/features/identity/SealMark';
import { useMyProfile } from '@/features/session/useMyProfile';
import { space } from '@/theme/tokens';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

// TODO: pantalla temporal; la reemplaza el foro en el siguiente slice.
export default function HomeScreen() {
  const profileQuery = useMyProfile();
  const profile = profileQuery.data;

  if (profileQuery.isError) {
    return (
      <Screen>
        <View style={styles.content}>
          <Text variant="ui">No pudimos cargar tu perfil. Revisa tu conexión.</Text>
          <Pressable accessibilityRole="button" onPress={() => profileQuery.refetch()} style={styles.retry}>
            <Text variant="ui" weight="semiBold">
              Reintentar
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.content}>
        {profile ? (
          <>
            <SealMark profile={profile} />
            <Text variant="title" weight="medium">
              Estás como {profile.display_name}
            </Text>
          </>
        ) : (
          <Text variant="ui" color="ink3">
            Cargando tu perfil…
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: space.s10,
    paddingHorizontal: space.gutter,
    gap: space.s4,
  },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});
