import { StyleSheet, View } from 'react-native';

import type { Profile } from '@/features/session/types';
import { radius } from '@/theme/tokens';
import { Text } from '@/ui/Text';

import { getAliasInitials, getSealColor } from './sealColor';

type SealMarkProps = {
  profile: Pick<Profile, 'id' | 'color' | 'display_name'>;
};

// Sello cuadrado con las iniciales del alias. Nunca un círculo: es un seudónimo, no una cara.
export function SealMark({ profile }: SealMarkProps) {
  return (
    <View
      // el alias escrito al lado es lo que lee el lector de pantalla
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.seal, { backgroundColor: getSealColor(profile) }]}>
      <Text variant="title" weight="bold" color="paper">
        {getAliasInitials(profile.display_name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  seal: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
