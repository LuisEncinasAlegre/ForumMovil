import { Pressable, StyleSheet } from 'react-native';

import { space } from '@/theme/tokens';

import { LineIcon } from './LineIcon';
import { Text } from './Text';

type SettingRowProps = {
  label: string;
  onPress: () => void;
};

// Fila de ajustes de Perfil: texto y un chevrón. Toda la fila se toca.
export function SettingRow({ label, onPress }: SettingRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text variant="body">{label}</Text>
      <LineIcon name="chevron" color="ink3" size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 54,
    paddingHorizontal: space.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.7,
  },
});
