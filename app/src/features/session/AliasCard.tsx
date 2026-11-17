import { Pressable, StyleSheet, View } from 'react-native';

import { SealMark } from '@/features/identity/SealMark';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Text } from '@/ui/Text';

import type { Profile } from './types';

type AliasCardProps = {
  profile: Profile | null;
  error: Error | null;
  onRetry: () => void;
};

// Tarjeta de la bienvenida con el alias. Mientras se crea muestra bloques fantasma del mismo
// tamaño; si falla, el mensaje y "Reintentar".
export function AliasCard({ profile, error, onRetry }: AliasCardProps) {
  const theme = useTheme();
  const cardStyle = [styles.card, { backgroundColor: theme.surface, borderColor: theme.line }];

  if (error) {
    return (
      <View style={cardStyle}>
        <View style={styles.who}>
          <Text variant="ui" color="ink">
            No pudimos crear tu alias. Revisa tu conexión.
          </Text>
          <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}>
            <Text variant="ui" weight="semiBold" color="ink">
              Reintentar
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View accessible accessibilityLabel="Creando tu alias" style={cardStyle}>
        <View style={[styles.ghostSeal, { backgroundColor: theme.line }]} />
        <View style={styles.who}>
          <View style={[styles.ghostLine, styles.ghostShort, { backgroundColor: theme.line }]} />
          <View style={[styles.ghostLine, styles.ghostLong, { backgroundColor: theme.line }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={cardStyle}>
      <SealMark profile={profile} />
      <View style={styles.who}>
        <Text variant="small" color="ink3">
          En este teléfono eres
        </Text>
        <Text variant="title" weight="medium">
          {profile.display_name}
        </Text>
        <Text variant="small" color="ink2">
          Un alias al azar. Nadie sabe de quién es.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    padding: space.s4,
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 90,
  },
  who: {
    flex: 1,
    gap: space.s1,
  },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  ghostSeal: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  ghostLine: {
    height: 14,
    borderRadius: radius.sm,
  },
  ghostShort: {
    width: '45%',
  },
  ghostLong: {
    width: '70%',
  },
});
