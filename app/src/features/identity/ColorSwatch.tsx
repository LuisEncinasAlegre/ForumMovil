import { Pressable, StyleSheet, View } from 'react-native';

import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { LineIcon } from '@/ui/LineIcon';

type ColorSwatchProps = {
  // null: el cuadro punteado de "Propio" antes de elegir uno
  color: string | null;
  label: string;
  isSelected: boolean;
  onSelect: () => void;
};

// Un color para elegir (components/identity-colors.elyx). 48pt para tocarlo cómodo.
export function ColorSwatch({ color, label, isSelected, onSelect }: ColorSwatchProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: isSelected }}
      onPress={onSelect}
      style={[styles.swatch, isSelected && { borderColor: theme.ink }]}>
      <View
        style={[
          styles.chip,
          color ? { backgroundColor: color } : [styles.empty, { borderColor: theme.ink3 }],
        ]}>
        {isSelected && color ? <LineIcon name="check" color="paper" size={space.s5} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  swatch: {
    width: space.s12,
    height: space.s12,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    width: space.s8,
    height: space.s8,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
