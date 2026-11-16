import { Pressable, StyleSheet, View } from 'react-native';

import { AliasTag } from '@/features/identity/AliasTag';
import { formatTimeAgo } from '@/lib/time';
import { space } from '@/theme/tokens';
import { MoreIcon } from '@/ui/MoreIcon';
import { Rule } from '@/ui/Rule';
import { Text } from '@/ui/Text';

import type { FeedPost } from './types';

type PostRowProps = {
  post: FeedPost;
  isMine: boolean;
  onOpenMenu: (post: FeedPost) => void;
  onOpenEdits: (post: FeedPost) => void;
};

// Fila del foro (components/post-row.elyx). Sin tarjeta: tipografía y una línea fina.
// TODO: tocar la fila abre el hilo (slice 04).
export function PostRow({ post, isMine, onOpenMenu, onOpenEdits }: PostRowProps) {
  // la hora es cuándo se publicó, aunque después se haya editado
  const timeAgo = formatTimeAgo(post.created_at);

  return (
    <View style={styles.row}>
      <View style={styles.meta}>
        <AliasTag author={post.author} />
        <View style={styles.side}>
          <Text variant="small" color="ink3">
            {timeAgo}
          </Text>
          {post.edited_at ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver versiones anteriores"
              hitSlop={space.s3}
              onPress={() => onOpenEdits(post)}>
              <Text variant="small" color="ink3">
                · editado
              </Text>
            </Pressable>
          ) : null}
          {isMine ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Opciones de tu publicación"
              hitSlop={space.s3}
              onPress={() => onOpenMenu(post)}>
              <MoreIcon />
            </Pressable>
          ) : null}
        </View>
      </View>
      <Text variant="bodyLarge" weight="semiBold">
        {post.title}
      </Text>
      <Text variant="ui" color="ink2" numberOfLines={3}>
        {post.content}
      </Text>
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
    gap: space.s2,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  side: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  foot: {
    paddingTop: space.s4,
  },
});
