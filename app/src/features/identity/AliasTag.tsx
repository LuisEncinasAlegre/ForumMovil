import { StyleSheet, View } from 'react-native';

import type { Profile } from '@/features/session/types';
import { radius, space } from '@/theme/tokens';
import { Text } from '@/ui/Text';

import { getSealColor } from './sealColor';

type AliasTagProps = {
  author: Pick<Profile, 'id' | 'color' | 'display_name'>;
};

// Cuadrito del color del sello y el alias, como firma de una publicación.
export function AliasTag({ author }: AliasTagProps) {
  return (
    <View style={styles.tag}>
      <View style={[styles.seal, { backgroundColor: getSealColor(author) }]} />
      <Text variant="small" weight="medium" color="ink2">
        {author.display_name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  seal: {
    width: 9,
    height: 9,
    borderRadius: radius.xs,
  },
});
