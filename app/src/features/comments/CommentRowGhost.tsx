import { StyleSheet, View } from 'react-native';

import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Rule } from '@/ui/Rule';

type CommentRowGhostProps = {
  // las de más abajo se ven más tenues
  fade?: number;
};

// Fila fantasma con la forma de una respuesta, mientras carga el hilo. Sin spinner.
export function CommentRowGhost({ fade = 1 }: CommentRowGhostProps) {
  const theme = useTheme();
  const block = { backgroundColor: theme.line };

  return (
    <View style={[styles.row, { opacity: fade }]}>
      <View style={[styles.alias, block]} />
      <View style={[styles.line, block]} />
      <View style={[styles.line, styles.lineShort, block]} />
      <View style={styles.foot}>
        <Rule />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingTop: space.s4,
    paddingHorizontal: space.gutter,
    gap: space.s3,
  },
  alias: {
    width: 96,
    height: 10,
    borderRadius: radius.xs,
  },
  line: {
    height: 14,
    borderRadius: radius.xs,
  },
  lineShort: {
    width: '70%',
  },
  foot: {
    paddingTop: space.s2,
  },
});
