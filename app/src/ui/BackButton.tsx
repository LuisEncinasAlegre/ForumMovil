import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { space } from '@/theme/tokens';

import { LineIcon } from './LineIcon';

// Flecha para volver de las pantallas internas.
export function BackButton() {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Volver" hitSlop={space.s3} onPress={() => router.back()}>
      <LineIcon name="back" />
    </Pressable>
  );
}
