import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AliasTag } from '@/features/identity/AliasTag';
import { PostRowGhost } from '@/features/posts/PostRowGhost';
import { PostVersion } from '@/features/posts/PostVersion';
import { usePost } from '@/features/posts/usePost';
import { usePostEdits } from '@/features/posts/usePostEdits';
import { formatVersionLabel } from '@/features/posts/versionLabel';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Message } from '@/ui/Message';
import { Text } from '@/ui/Text';

// Hoja con las versiones de una publicación editada (screens/ediciones.elyx).
export default function EditsScreen() {
  const params = useLocalSearchParams<{ postId: string }>();
  const parsedId = Number(params.postId);
  // un id roto se trata como publicación que ya no está
  const validPostId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  const postQuery = usePost(validPostId);
  const editsQuery = usePostEdits(validPostId);
  const theme = useTheme();

  function retry(): void {
    postQuery.refetch();
    editsQuery.refetch();
  }

  return (
    <ScrollView style={{ backgroundColor: theme.paper }} contentContainerStyle={styles.content}>
      {/* en Android las hojas no muestran cabecera, así que el título va en el contenido */}
      <View style={styles.head}>
        <Text variant="title" weight="semiBold" accessibilityRole="header">
          Versiones
        </Text>
        {postQuery.data ? <AliasTag author={postQuery.data.author} /> : null}
      </View>

      {validPostId !== null && (postQuery.isPending || editsQuery.isPending) ? (
        <>
          <PostRowGhost />
          <PostRowGhost fade={0.6} />
        </>
      ) : null}

      {validPostId !== null && (postQuery.isError || editsQuery.isError) ? (
        <Message
          title="No pudimos cargar las versiones."
          body="Revisa tu conexión y vuelve a intentarlo."
          actionLabel="Reintentar"
          onAction={retry}
        />
      ) : null}

      {validPostId === null || (postQuery.isSuccess && !postQuery.data) ? (
        <Message title="Esta publicación ya no está." body="La eliminaron o ya no se puede ver." />
      ) : null}

      {postQuery.data && editsQuery.data ? (
        <>
          <PostVersion label="Ahora" title={postQuery.data.title} content={postQuery.data.content} />
          {editsQuery.data.map((edit) => (
            <PostVersion
              key={edit.id}
              label={formatVersionLabel(edit.written_at)}
              title={edit.title}
              content={edit.content}
            />
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
