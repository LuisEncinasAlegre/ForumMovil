import { StyleSheet, View } from 'react-native';

import type { Profile } from '@/features/session/types';
import { radius } from '@/theme/tokens';
import { Text } from '@/ui/Text';

import { getAliasInitials, getSealColor } from './sealColor';

type SealMarkProps = {
  profile: Pick<Profile, 'id' | 'color' | 'display_name'>;
  // small: el de la cabecera del foro; large: bienvenida y Tú
  size?: 'small' | 'large';
};

// Sello cuadrado con las iniciales del alias. Nunca un círculo: es un seudónimo, no una cara.
export function SealMark({ profile, size = 'large' }: SealMarkProps) {
  const isSmall = size === 'small';

  return (
    <View
      // el alias escrito al lado es lo que lee el lector de pantalla
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[isSmall ? styles.small : styles.large, { backgroundColor: getSealColor(profile) }]}>
      <Text variant={isSmall ? 'small' : 'title'} weight={isSmall ? 'semiBold' : 'bold'} color="paper">
        {getAliasInitials(profile.display_name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  large: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
