import { StyleSheet, View } from 'react-native';

import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Rule } from '@/ui/Rule';

type PostRowGhostProps = {
  // las de más abajo se ven más tenues, como en foro-estados.elyx
  fade?: number;
};

// Fila fantasma con la forma de una publicación, mientras carga. Sin spinner.
export function PostRowGhost({ fade = 1 }: PostRowGhostProps) {
  const theme = useTheme();
  const block = { backgroundColor: theme.line };

  return (
    <View style={[styles.row, { opacity: fade }]}>
      <View style={[styles.alias, block]} />
      <View style={[styles.titleLine, block]} />
      <View style={[styles.titleLine, styles.titleShort, block]} />
      <View style={[styles.excerpt, block]} />
      <View style={styles.foot}>
        <Rule />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingTop: space.s5,
    paddingHorizontal: space.gutter,
    gap: space.s3,
  },
  alias: {
    width: 96,
    height: 10,
    borderRadius: radius.xs,
  },
  titleLine: {
    height: 18,
    borderRadius: radius.xs,
  },
  titleShort: {
    width: '62%',
  },
  excerpt: {
    width: '84%',
    height: 12,
    borderRadius: radius.xs,
    opacity: 0.6,
  },
  foot: {
    paddingTop: space.s2,
  },
});
