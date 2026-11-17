import { StyleSheet, View } from 'react-native';

import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

// Ícono "⋯" hecho con tres puntos, para no agregar una librería de íconos por uno solo.
export function MoreIcon() {
  const theme = useTheme();

  return (
    <View style={styles.icon}>
      <View style={[styles.dot, { backgroundColor: theme.ink3 }]} />
      <View style={[styles.dot, { backgroundColor: theme.ink3 }]} />
      <View style={[styles.dot, { backgroundColor: theme.ink3 }]} />
    </View>
  );
}

// Los 2 y 3 son medidas del dibujo del ícono (como en more.svg), no espaciado de la interfaz.
const styles = StyleSheet.create({
  icon: {
    width: space.s5,
    height: space.s5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: radius.xs,
  },
});
