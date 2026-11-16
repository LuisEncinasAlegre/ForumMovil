import { Pressable, StyleSheet } from 'react-native';

import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { Text } from './Text';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
};

// Botón principal: uno por pantalla, relleno con tinta. Las acciones secundarias son texto.
export function Button({ label, onPress, disabled = false, isLoading = false }: ButtonProps) {
  const theme = useTheme();
  const isInactive = disabled || isLoading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: isLoading }}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.ink },
        isInactive && styles.inactive,
        pressed && styles.pressed,
      ]}>
      <Text variant="body" weight="semiBold" color="paper">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space.s6,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  inactive: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
});
