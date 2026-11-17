import { Pressable, StyleSheet, View } from 'react-native';

import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Text } from '@/ui/Text';

type CreatePostDockProps = {
  onPress: () => void;
  disabled?: boolean;
};

// Muelle de abajo del foro (blocks/bars.elyx, createDock). Acento porque lleva a publicar.
export function CreatePostDock({ onPress, disabled = false }: CreatePostDockProps) {
  const theme = useTheme();

  return (
    <View style={[styles.dock, { borderColor: theme.line, backgroundColor: theme.paper }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.accent },
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}>
        <Text variant="ui" weight="semiBold" color="onAccent">
          Crear publicación
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    borderTopWidth: 1,
    paddingTop: space.s3,
    paddingHorizontal: space.gutter,
    paddingBottom: space.s2,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: space.s4,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.8,
  },
});
