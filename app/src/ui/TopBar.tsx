import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { Text } from './Text';

type TopBarProps = {
  left: ReactNode;
  right?: ReactNode;
  // título centrado de las pantallas internas (Perfil, Reglas, Privacidad)
  title?: string;
  // la cabecera del foro lleva una línea abajo; la de Escribir no
  hasRule?: boolean;
};

// Barra de arriba: algo a la izquierda (marca, volver o "Cancelar"), un título opcional
// y una acción a la derecha.
export function TopBar({ left, right, title, hasRule = false }: TopBarProps) {
  const theme = useTheme();

  return (
    <View style={[styles.bar, hasRule && { borderBottomWidth: 1, borderColor: theme.line }]}>
      {title ? (
        // va detrás de los botones para quedar centrado sin importar qué tan anchos son
        <View pointerEvents="none" style={styles.titleBox}>
          <Text variant="body" weight="semiBold" accessibilityRole="header" numberOfLines={1}>
            {title}
          </Text>
        </View>
      ) : null}
      {left}
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 52,
    paddingHorizontal: space.gutter,
    paddingVertical: space.s2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBox: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.s12,
  },
});
