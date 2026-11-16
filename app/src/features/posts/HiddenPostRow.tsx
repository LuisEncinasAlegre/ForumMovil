import { StyleSheet, View } from 'react-native';

import { AliasTag } from '@/features/identity/AliasTag';
import { formatTimeAgo } from '@/lib/time';
import { space } from '@/theme/tokens';
import { Rule } from '@/ui/Rule';
import { Text } from '@/ui/Text';

import type { FeedPost } from './types';

type HiddenPostRowProps = {
  post: FeedPost;
};

// Tu publicación oculta por moderación, en Perfil (postRowHidden en components/post-row.elyx).
// No se toca: ya no se puede abrir, editar ni eliminar; el motivo llegó en el aviso.
export function HiddenPostRow({ post }: HiddenPostRowProps) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${post.title}. Oculta por moderación.`}>
      <View style={styles.meta}>
        <AliasTag author={post.author} />
        <Text variant="small" color="ink3">
          {formatTimeAgo(post.created_at)}
        </Text>
      </View>
      <Text variant="bodyLarge" weight="semiBold" color="ink2">
        {post.title}
      </Text>
      <View style={styles.foot}>
        <Text variant="small" color="ink3">
          Oculta por moderación
        </Text>
        <Rule />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingTop: space.s4,
    paddingHorizontal: space.gutter,
    gap: space.s2,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foot: {
    paddingTop: space.s1,
    gap: space.s4,
  },
});
