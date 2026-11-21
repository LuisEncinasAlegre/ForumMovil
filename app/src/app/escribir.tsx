import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ComposeForm } from '@/features/posts/ComposeForm';
import { PostRowGhost } from '@/features/posts/PostRowGhost';
import { usePost } from '@/features/posts/usePost';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Message } from '@/ui/Message';
import { Text } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';

const emptyDraft = { title: '', content: '' };

// Escribir una publicación nueva, o editar una tuya con ?postId=12.
export default function WriteScreen() {
  const params = useLocalSearchParams<{ postId?: string }>();
  const isEditingParam = params.postId !== undefined;
  const parsedId = isEditingParam ? Number(params.postId) : null;
  const validPostId = parsedId !== null && Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  const postQuery = usePost(validPostId);
  const theme = useTheme();

  if (!isEditingParam) {
    return <ComposeForm postId={null} initialDraft={emptyDraft} />;
  }

  if (validPostId !== null && postQuery.data) {
    return (
      <ComposeForm postId={validPostId} initialDraft={{ title: postQuery.data.title, content: postQuery.data.content }} />
    );
  }

  // Cargando, error, o la publicación ya no se puede editar. Siempre hay cómo salir.
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.paper }]}>
      <TopBar
        left={
          <Pressable accessibilityRole="button" hitSlop={space.s3} onPress={() => router.back()}>
            <Text variant="body" weight="medium" color="ink2">
              Cancelar
            </Text>
          </Pressable>
        }
      />
      {validPostId !== null && postQuery.isPending ? <PostRowGhost /> : null}
      {validPostId !== null && postQuery.isError ? (
        <Message
          title="No pudimos cargar tu publicación."
          body="Revisa tu conexión y vuelve a intentarlo."
          actionLabel="Reintentar"
          onAction={() => postQuery.refetch()}
        />
      ) : null}
      {validPostId === null || postQuery.isSuccess ? (
        <Message title="Esta publicación ya no se puede editar." body="Puede que la hayas eliminado." />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
