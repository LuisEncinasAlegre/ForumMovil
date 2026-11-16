import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Text } from '@/ui/Text';

import { banTitle } from './banText';
import type { ActiveBan } from './types';

type BlockedDockProps = {
  ban: ActiveBan;
};

// Muelle de abajo cuando no puedes escribir (blocks/bars.elyx, blockedDock).
export function BlockedDock({ ban }: BlockedDockProps) {
  const theme = useTheme();

  return (
    <View style={[styles.dock, { borderColor: theme.line, backgroundColor: theme.paper }]}>
      <Text variant="ui" weight="medium" color="ink3" style={styles.label}>
        {banTitle(ban)}
      </Text>
      <Pressable accessibilityRole="button" hitSlop={space.s3} onPress={() => router.push('/suspendida')}>
        <Text variant="ui" weight="semiBold">
          Ver por qué
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s3,
    minHeight: space.s12 + space.s5,
    borderTopWidth: 1,
    paddingTop: space.s3,
    paddingHorizontal: space.gutter,
    paddingBottom: space.s2,
  },
  label: {
    flex: 1,
  },
});
