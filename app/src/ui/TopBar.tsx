import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type TopBarProps = {
  left: ReactNode;
  right?: ReactNode;
  // la cabecera del foro lleva una línea abajo; la de Escribir no
  hasRule?: boolean;
};

// Barra de arriba: algo a la izquierda (marca o "Cancelar") y una acción a la derecha.
export function TopBar({ left, right, hasRule = false }: TopBarProps) {
  const theme = useTheme();

  return (
    <View style={[styles.bar, hasRule && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.line }]}>
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
});
