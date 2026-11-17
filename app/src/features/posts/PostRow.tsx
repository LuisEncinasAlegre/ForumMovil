import { Pressable, StyleSheet, View, type AccessibilityActionEvent } from 'react-native';

import { AliasTag } from '@/features/identity/AliasTag';
import { formatTimeAgo } from '@/lib/time';
import { space } from '@/theme/tokens';
import { MoreIcon } from '@/ui/MoreIcon';
import { Rule } from '@/ui/Rule';
import { Text } from '@/ui/Text';

import { formatReplyCount } from './replyCountLabel';
import type { FeedPost } from './types';

type PostRowProps = {
  post: FeedPost;
  isMine: boolean;
  onOpen: (post: FeedPost) => void;
  onOpenMenu: (post: FeedPost) => void;
  onOpenEdits: (post: FeedPost) => void;
  // en Perfil la fila va sin el extracto (postRowCompact)
  isCompact?: boolean;
};

// Fila del foro (components/post-row.elyx). Sin tarjeta: tipografía y una línea fina.
// Toda la fila abre el hilo; "editado" y "⋯" tienen su propio toque encima. Mantener presionado
// abre el mismo menú que "⋯".
export function PostRow({ post, isMine, onOpen, onOpenMenu, onOpenEdits, isCompact = false }: PostRowProps) {
  // la hora es cuándo se publicó, aunque después se haya editado
  const timeAgo = formatTimeAgo(post.created_at);
  const replies = post.replyCount > 0 ? ', ' + formatReplyCount(post.replyCount) : '';

  // Con lector de pantalla la fila es un solo elemento, así que "⋯" y "editado" van como acciones
  // de la fila (VoiceOver y TalkBack no llegan a botones dentro de otro botón).
  const accessibilityActions = [
    { name: 'activate' },
    { name: 'menu', label: isMine ? 'Opciones de tu publicación' : 'Opciones de la publicación' },
    ...(post.edited_at ? [{ name: 'edits', label: 'Ver versiones anteriores' }] : []),
  ];

  function runAccessibilityAction(event: AccessibilityActionEvent): void {
    if (event.nativeEvent.actionName === 'menu') {
      onOpenMenu(post);
      return;
    }
    if (event.nativeEvent.actionName === 'edits') {
      onOpenEdits(post);
      return;
    }
    onOpen(post);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${post.title}. ${post.author.display_name}, ${timeAgo}${post.edited_at ? ', editado' : ''}${replies}`}
      accessibilityHint="Abre el hilo"
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={runAccessibilityAction}
      onPress={() => onOpen(post)}
      onLongPress={() => onOpenMenu(post)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
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
          {/* todas llevan "⋯": las tuyas para editar o eliminar, las de otros para reportar */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isMine ? 'Opciones de tu publicación' : 'Opciones de la publicación'}
            hitSlop={space.s3}
            onPress={() => onOpenMenu(post)}>
            <MoreIcon />
          </Pressable>
        </View>
      </View>
      <Text variant="bodyLarge" weight="semiBold">
        {post.title}
      </Text>
      {isCompact ? null : (
        <Text variant="ui" color="ink2" numberOfLines={3}>
          {post.content}
        </Text>
      )}
      <View style={styles.foot}>
        {/* sin respuestas no mostramos nada */}
        {post.replyCount > 0 ? (
          <Text variant="small" weight="medium" color="ink3">
            {formatReplyCount(post.replyCount)}
          </Text>
        ) : null}
        <Rule />
      </View>
    </Pressable>
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
  pressed: {
    opacity: 0.7,
  },
  foot: {
    paddingTop: space.s1,
    gap: space.s4,
  },
});
