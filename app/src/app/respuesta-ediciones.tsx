import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useComment } from '@/features/comments/useComment';
import { useCommentEdits } from '@/features/comments/useCommentEdits';
import { AliasTag } from '@/features/identity/AliasTag';
import { PostRowGhost } from '@/features/posts/PostRowGhost';
import { PostVersion } from '@/features/posts/PostVersion';
import { formatVersionLabel } from '@/features/posts/versionLabel';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Message } from '@/ui/Message';
import { Text } from '@/ui/Text';

// Hoja con las versiones de una respuesta editada. Igual que la de publicaciones, sin título.
export default function CommentEditsScreen() {
  const params = useLocalSearchParams<{ commentId: string }>();
  const parsedId = Number(params.commentId);
  // un id roto se trata como respuesta que ya no está
  const validCommentId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  const commentQuery = useComment(validCommentId);
  const editsQuery = useCommentEdits(validCommentId);
  const theme = useTheme();

  function retry(): void {
    commentQuery.refetch();
    editsQuery.refetch();
  }

  return (
    <ScrollView style={{ backgroundColor: theme.paper }} contentContainerStyle={styles.content}>
      {/* en Android las hojas no muestran cabecera, así que el título va en el contenido */}
      <View style={styles.head}>
        <Text variant="title" weight="semiBold" accessibilityRole="header">
          Versiones
        </Text>
        {commentQuery.data ? <AliasTag author={commentQuery.data.author} /> : null}
      </View>

      {validCommentId !== null && (commentQuery.isPending || editsQuery.isPending) ? (
        <>
          <PostRowGhost />
          <PostRowGhost fade={0.6} />
        </>
      ) : null}

      {validCommentId !== null && (commentQuery.isError || editsQuery.isError) ? (
        <Message
          title="No pudimos cargar las versiones."
          body="Revisa tu conexión y vuelve a intentarlo."
          actionLabel="Reintentar"
          onAction={retry}
        />
      ) : null}

      {validCommentId === null || (commentQuery.isSuccess && !commentQuery.data) ? (
        <Message title="Esta respuesta ya no está." body="La eliminaron o ya no se puede ver." />
      ) : null}

      {commentQuery.data && editsQuery.data ? (
        <>
          <PostVersion label="Ahora" content={commentQuery.data.content} />
          {editsQuery.data.map((edit) => (
            <PostVersion key={edit.id} label={formatVersionLabel(edit.written_at)} content={edit.content} />
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: space.s8,
  },
  head: {
    paddingTop: space.s5,
    paddingHorizontal: space.gutter,
    paddingBottom: space.s3,
    gap: space.s2,
  },
});
