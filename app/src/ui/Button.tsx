import { Pressable, StyleSheet } from 'react-native';

import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { Text } from './Text';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  // accent solo para lo que publica algo (Publicar, Guardar); lo demás va en tinta
  tone?: 'ink' | 'accent';
  // compact: la píldora pequeña de las barras superiores
  size?: 'regular' | 'compact';
  // false: el botón mide lo que su texto (por ejemplo "Reintentar")
  stretch?: boolean;
};

// Botón principal: uno por pantalla. Las acciones secundarias son texto.
export function Button({
  label,
  onPress,
  disabled = false,
  isLoading = false,
  tone = 'ink',
  size = 'regular',
  stretch = true,
}: ButtonProps) {
  const theme = useTheme();
  const isInactive = disabled || isLoading;
  const isCompact = size === 'compact';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: isLoading }}
      disabled={isInactive}
      onPress={onPress}
      // la píldora mide 36; con esto el área táctil llega a 44
      hitSlop={isCompact ? space.s1 : undefined}
      style={({ pressed }) => [
        isCompact ? styles.compact : styles.regular,
        { backgroundColor: tone === 'accent' ? theme.accent : theme.ink },
        !isCompact && !stretch && styles.hug,
        isInactive && styles.inactive,
        pressed && styles.pressed,
      ]}>
      <Text variant={isCompact ? 'ui' : 'body'} weight="semiBold" color={tone === 'accent' ? 'onAccent' : 'paper'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  regular: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space.s6,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  compact: {
    minHeight: 36,
    borderRadius: radius.pill,
    paddingHorizontal: space.s4,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  hug: {
    alignSelf: 'flex-start',
  },
  inactive: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
});
