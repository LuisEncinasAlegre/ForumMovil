import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type ScreenProps = {
  children: ReactNode;
  // Lo que va fijo abajo (por ejemplo el botón principal).
  footer?: ReactNode;
};

export function Screen({ children, footer }: ScreenProps) {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.paper }]}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  footer: {
    paddingHorizontal: space.gutter,
    paddingTop: space.s3,
    paddingBottom: space.s2,
    alignItems: 'center',
    gap: space.s3,
  },
});
