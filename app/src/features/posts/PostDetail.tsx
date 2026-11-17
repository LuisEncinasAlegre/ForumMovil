import { Pressable, StyleSheet, View } from 'react-native';

import { AliasTag } from '@/features/identity/AliasTag';
import { formatTimeAgo } from '@/lib/time';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Rule } from '@/ui/Rule';
import { Text } from '@/ui/Text';

import { formatReplyCount } from './replyCountLabel';
import type { FeedPost } from './types';

type PostDetailProps = {
  post: FeedPost;
  onOpenEdits: (post: FeedPost) => void;
};

// La publicación completa arriba del hilo (screens/hilo.elyx): alias, título grande, texto
// entero y la banda con el número de respuestas. Sin respuestas, solo una línea fina.
export function PostDetail({ post, onOpenEdits }: PostDetailProps) {
  const theme = useTheme();

  return (
    <View>
      <View style={styles.post}>
        <View style={styles.meta}>
          <AliasTag author={post.author} />
          <Text variant="small" color="ink3">
            {formatTimeAgo(post.created_at)}
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
        </View>
        <Text variant="titleXl" weight="medium" accessibilityRole="header">
          {post.title}
        </Text>
        <Text variant="bodyLarge">{post.content}</Text>
      </View>
      {post.replyCount > 0 ? (
        <View style={[styles.band, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text variant="small" weight="semiBold" color="ink2">
            {formatReplyCount(post.replyCount)}
          </Text>
        </View>
      ) : (
        <Rule />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  post: {
    paddingTop: space.s2,
    paddingHorizontal: space.gutter,
    paddingBottom: space.s5,
    gap: space.s3,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  band: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: space.s3,
    paddingHorizontal: space.gutter,
  },
});
