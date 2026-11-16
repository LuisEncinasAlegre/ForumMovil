import { Pressable, StyleSheet, View } from 'react-native';

import { AliasTag } from '@/features/identity/AliasTag';
import { formatTimeAgo } from '@/lib/time';
import { space } from '@/theme/tokens';
import { MoreIcon } from '@/ui/MoreIcon';
import { Rule } from '@/ui/Rule';
import { Text } from '@/ui/Text';

import type { ThreadComment } from './types';

type CommentRowProps = {
  comment: ThreadComment;
  isMine: boolean;
  // quien abrió el hilo lleva la marca "autor"
  isByPostAuthor: boolean;
  // la respuesta que se está enviando todavía no existe en el servidor
  isPending?: boolean;
  onOpenMenu: (comment: ThreadComment) => void;
  onOpenEdits: (comment: ThreadComment) => void;
};

// Respuesta dentro de un hilo (components/comment.elyx). Lista plana, sin anidar.
export function CommentRow({
  comment,
  isMine,
  isByPostAuthor,
  isPending = false,
  onOpenMenu,
  onOpenEdits,
}: CommentRowProps) {
  return (
    <View
      style={[styles.row, isPending && styles.pending]}
      accessibilityLabel={isPending ? 'Enviando tu respuesta' : undefined}>
      <View style={styles.meta}>
        <AliasTag author={comment.author} />
        {isByPostAuthor ? (
          // el acento aquí es la excepción del diseño: marca a quien abrió el hilo
          <Text variant="micro" weight="semiBold" color="accent">
            autor
          </Text>
        ) : null}
        <Text variant="small" color="ink3">
          {isPending ? 'enviando…' : formatTimeAgo(comment.created_at)}
        </Text>
        {comment.edited_at ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver versiones anteriores de la respuesta"
            hitSlop={space.s3}
            onPress={() => onOpenEdits(comment)}>
            <Text variant="small" color="ink3">
              · editado
            </Text>
          </Pressable>
        ) : null}
        {/* todas llevan "⋯": las tuyas para editar o eliminar, las de otros para reportar */}
        {!isPending ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isMine ? 'Opciones de tu respuesta' : 'Opciones de la respuesta'}
            hitSlop={space.s3}
            onPress={() => onOpenMenu(comment)}
            style={styles.more}>
            <MoreIcon />
          </Pressable>
        ) : null}
      </View>
      <Text variant="body">{comment.content}</Text>
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
  pending: {
    opacity: 0.5,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  more: {
    marginLeft: 'auto',
  },
  foot: {
    paddingTop: space.s4,
  },
});
