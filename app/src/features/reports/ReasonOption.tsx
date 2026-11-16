import { Pressable, StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Text } from '@/ui/Text';

type ReasonOptionProps = {
  label: string;
  isSelected: boolean;
  onSelect: () => void;
};

const RADIO_SIZE = 20;
const DOT_SIZE = 10;

// Un motivo de la hoja Reportar: el círculo del radio, la etiqueta y una línea fina abajo.
export function ReasonOption({ label, isSelected, onSelect }: ReasonOptionProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      onPress={onSelect}
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.line }, pressed && styles.pressed]}>
      <View style={[styles.radio, { borderColor: isSelected ? theme.accent : theme.ink3 }]}>
        {isSelected ? <View style={[styles.dot, { backgroundColor: theme.accent }]} /> : null}
      </View>
      <Text variant="body" weight={isSelected ? 'semiBold' : 'regular'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    borderBottomWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  radio: {
    width: RADIO_SIZE,
    height: RADIO_SIZE,
    borderRadius: RADIO_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
