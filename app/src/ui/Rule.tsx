import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

// Línea fina que separa filas. Va dentro del margen de la pantalla, no de borde a borde.
export function Rule() {
  const theme = useTheme();

  return <View style={[styles.rule, { backgroundColor: theme.line }]} />;
}

const styles = StyleSheet.create({
  rule: {
    // 1pt como en el diseño; hairlineWidth casi no se ve en pantallas densas con este color
    height: 1,
    alignSelf: 'stretch',
  },
});
