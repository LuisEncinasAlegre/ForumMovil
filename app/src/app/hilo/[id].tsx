import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommentRow } from '@/features/comments/CommentRow';
import { CommentRowGhost } from '@/features/comments/CommentRowGhost';
import { ReplyDock } from '@/features/comments/ReplyDock';
import type { ThreadComment } from '@/features/comments/types';
import { useCommentMenu } from '@/features/comments/useCommentMenu';
import { useReplyDock } from '@/features/comments/useReplyDock';
import { useThread } from '@/features/comments/useThread';
import { BlockedDock } from '@/features/moderation/BlockedDock';
import { useMyBan } from '@/features/moderation/useMyBan';
import { PostDetail } from '@/features/posts/PostDetail';
import { PostRowGhost } from '@/features/posts/PostRowGhost';
import type { FeedPost } from '@/features/posts/types';
import { usePost } from '@/features/posts/usePost';
import { usePostMenu } from '@/features/posts/usePostMenu';
import { useMyProfile } from '@/features/session/useMyProfile';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { ActionSheet } from '@/ui/ActionSheet';
import { BackButton } from '@/ui/BackButton';
import { Message } from '@/ui/Message';
import { MoreIcon } from '@/ui/MoreIcon';
import { Text } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';

const GHOST_FADES = [1, 0.7, 0.4];

function openPostEdits(post: FeedPost): void {
  router.push({ pathname: '/ediciones', params: { postId: String(post.id) } });
}

function openCommentEdits(comment: ThreadComment): void {
  router.push({ pathname: '/respuesta-ediciones', params: { commentId: String(comment.id) } });
}

// Hilo: la publicación completa y sus respuestas en orden (screens/hilo.elyx).
export default function ThreadScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  // un id que no es número (enlace roto) se trata como publicación que ya no está
  const postId = Number(params.id);
  const isValidId = Number.isInteger(postId) && postId > 0;
  const theme = useTheme();
  const postQuery = usePost(isValidId ? postId : null);
  const thread = useThread(postId);
  const profileQuery = useMyProfile();
  const dock = useReplyDock(postId);
  const commentMenu = useCommentMenu({ onEdit: dock.startEditing });
  const postMenu = usePostMenu();
  const { ban } = useMyBan();
  const listRef = useRef<FlatList<ThreadComment>>(null);
  // solo mostramos el indicador cuando la persona jaló hacia abajo
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const post = postQuery.data;
  const me = profileQuery.data;
  const comments = thread.data?.pages.flat() ?? [];

  async function refreshFromPull(): Promise<void> {
    setIsPullRefreshing(true);
    await Promise.all([postQuery.refetch(), thread.refetch()]);
    setIsPullRefreshing(false);
  }

  function loadMore(): void {
    if (thread.hasNextPage && !thread.isFetchingNextPage && !thread.isFetchNextPageError) {
      thread.fetchNextPage();
    }
  }

  function scrollToEnd(): void {
    // esperamos un cuadro para que la respuesta tenue ya esté en la lista
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }

  function renderEmpty() {
    if (thread.isPending) {
      return (
        <View accessibilityLabel="Cargando las respuestas">
          {GHOST_FADES.map((fade) => (
            <CommentRowGhost key={fade} fade={fade} />
          ))}
        </View>
      );
    }
    if (thread.isError) {
      return (
        <Pressable accessibilityRole="button" onPress={() => thread.refetch()} style={styles.notice}>
          <Text variant="small" color="ink2">
            No pudimos cargar las respuestas. Toca para reintentar.
          </Text>
        </Pressable>
      );
    }
    // mientras se envía la primera respuesta ya se ve abajo, tenue
    if (dock.pendingReply !== null) {
      return undefined;
    }
    return (
      <View style={styles.quiet}>
        <Text variant="bodyLarge" weight="medium">
          Nadie ha respondido todavía.
        </Text>
      </View>
    );
  }

  function renderFooter() {
    return (
      <>
        {thread.isFetchingNextPage ? <CommentRowGhost /> : null}
        {thread.isFetchNextPageError ? (
          <Pressable accessibilityRole="button" onPress={() => thread.fetchNextPage()} style={styles.notice}>
            <Text variant="small" color="ink2">
              No pudimos cargar más respuestas. Toca para reintentar.
            </Text>
          </Pressable>
        ) : null}
        {dock.pendingReply !== null && me ? (
          <CommentRow
            comment={{
              id: 0,
              post_id: postId,
              content: dock.pendingReply.trim(),
              created_at: new Date().toISOString(),
              edited_at: null,
              // si pudiste responder, tu cuenta no está suspendida
              author: { ...me, restriction: null },
            }}
            isMine
            isByPostAuthor={post?.author.id === me.id}
            isPending
            onOpenMenu={(comment) => commentMenu.openCommentMenu(comment, true)}
            onOpenEdits={openCommentEdits}
          />
        ) : null}
      </>
    );
  }

  function renderBody() {
    if (postQuery.isPending && isValidId) {
      return (
        <View accessibilityLabel="Cargando el hilo">
          <PostRowGhost />
          {GHOST_FADES.map((fade) => (
            <CommentRowGhost key={fade} fade={fade} />
          ))}
        </View>
      );
    }
    // el error de pantalla completa solo cuando no hay nada guardado que mostrar
    if (postQuery.isError && !post) {
      return (
        <Message
          title="No pudimos cargar el hilo."
          body="Parece que no hay conexión. Revisa tu red y vuelve a intentarlo."
          actionLabel="Reintentar"
          onAction={() => postQuery.refetch()}
        />
      );
    }
    if (!post) {
      return (
        <Message
          title="Esta publicación ya no está."
          body="La eliminaron o ya no se puede ver. Vuelve al foro para seguir leyendo."
        />
      );
    }
    return (
      <KeyboardAvoidingView style={styles.screen} behavior="padding">
        <FlatList
          ref={listRef}
          data={comments}
          keyExtractor={(comment) => String(comment.id)}
          renderItem={({ item }) => (
            <CommentRow
              comment={item}
              isMine={item.author.id === me?.id}
              isByPostAuthor={item.author.id === post.author.id}
              onOpenMenu={(comment) => commentMenu.openCommentMenu(comment, comment.author.id === me?.id)}
              onOpenEdits={openCommentEdits}
            />
          )}
          ListHeaderComponent={<PostDetail post={post} onOpenEdits={openPostEdits} />}
          ListEmptyComponent={renderEmpty()}
          ListFooterComponent={renderFooter()}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={refreshFromPull}
              tintColor={theme.ink3}
              colors={[theme.ink3]}
              progressBackgroundColor={theme.surface}
            />
          }
          style={styles.screen}
        />
        {ban ? (
          <BlockedDock ban={ban} />
        ) : (
          <ReplyDock dock={dock} authorName={me?.display_name ?? 'tu alias'} onSent={scrollToEnd} />
        )}
      </KeyboardAvoidingView>
    );
  }

  // Si algo falla con el hilo ya en pantalla, lo dejamos y avisamos en una línea.
  let notice: string | null = null;
  if (postQuery.isRefetchError || thread.isRefetchError) {
    notice = 'No pudimos actualizar el hilo. Desliza hacia abajo para reintentar.';
  }
  if (commentMenu.deleteErrorMessage) {
    notice = 'No pudimos eliminar tu respuesta. ' + commentMenu.deleteErrorMessage;
  }
  if (postMenu.deleteErrorMessage) {
    notice = 'No pudimos eliminar tu publicación. ' + postMenu.deleteErrorMessage;
  }

  const isMyPost = !!post && post.author.id === me?.id;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.paper }]} edges={['top', 'bottom']}>
      <TopBar
        left={<BackButton />}
        // tu publicación: editar o eliminar; la de otra persona: reportar
        right={
          post ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isMyPost ? 'Opciones de tu publicación' : 'Opciones de la publicación'}
              hitSlop={space.s3}
              onPress={() => postMenu.openPostMenu(post, { isMine: isMyPost, onDeleted: () => router.back() })}>
              <MoreIcon />
            </Pressable>
          ) : null
        }
      />
      {notice ? (
        <Text variant="small" color="ink2" style={styles.notice} accessibilityRole="alert">
          {notice}
        </Text>
      ) : null}
      {renderBody()}
      <ActionSheet sheet={postMenu.sheet} onClose={postMenu.closeSheet} />
      <ActionSheet sheet={commentMenu.sheet} onClose={commentMenu.closeSheet} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  notice: {
    paddingHorizontal: space.gutter,
    paddingVertical: space.s3,
  },
  quiet: {
    paddingTop: space.s6,
    paddingHorizontal: space.gutter,
  },
});
