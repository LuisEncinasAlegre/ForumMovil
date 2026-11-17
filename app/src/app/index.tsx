import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BlockedDock } from '@/features/moderation/BlockedDock';
import { useMyBan } from '@/features/moderation/useMyBan';
import { useShowBanOnFocus } from '@/features/moderation/useShowBanOnFocus';
import { useShowNoticeOnFocus } from '@/features/moderation/useShowNoticeOnFocus';
import { CreatePostDock } from '@/features/posts/CreatePostDock';
import { PostRow } from '@/features/posts/PostRow';
import { PostRowGhost } from '@/features/posts/PostRowGhost';
import type { FeedPost } from '@/features/posts/types';
import { useFeed } from '@/features/posts/useFeed';
import { usePostMenu } from '@/features/posts/usePostMenu';
import { useMyProfile } from '@/features/session/useMyProfile';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { ActionSheet } from '@/ui/ActionSheet';
import { LineIcon } from '@/ui/LineIcon';
import { Message } from '@/ui/Message';
import { Text } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';

const GHOST_FADES = [1, 0.8, 0.55, 0.3];

function openThread(post: FeedPost): void {
  router.push({ pathname: '/hilo/[id]', params: { id: String(post.id) } });
}

function openEdits(post: FeedPost): void {
  router.push({ pathname: '/ediciones', params: { postId: String(post.id) } });
}

// Foro: las publicaciones más nuevas arriba (screens/foro.elyx y foro-estados.elyx).
export default function ForoScreen() {
  const theme = useTheme();
  const feed = useFeed();
  const profileQuery = useMyProfile();
  const postMenu = usePostMenu();
  const { ban } = useMyBan();
  // la pantalla de suspensión va primero; el aviso espera a la siguiente vez que vuelvas al foro
  const isShowingBan = useShowBanOnFocus();
  useShowNoticeOnFocus(isShowingBan);
  // solo mostramos el indicador cuando la persona jaló hacia abajo, no en recargas de fondo
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const posts = feed.data?.pages.flat() ?? [];
  const myUserId = profileQuery.data?.id;

  async function refreshFromPull(): Promise<void> {
    setIsPullRefreshing(true);
    await feed.refetch();
    setIsPullRefreshing(false);
  }

  function loadMore(): void {
    if (feed.hasNextPage && !feed.isFetchingNextPage && !feed.isFetchNextPageError) {
      feed.fetchNextPage();
    }
  }

  function renderEmpty() {
    if (feed.isPending) {
      return (
        <View accessibilityLabel="Cargando el foro">
          {GHOST_FADES.map((fade) => (
            <PostRowGhost key={fade} fade={fade} />
          ))}
        </View>
      );
    }
    if (feed.isError) {
      return (
        <Message
          title="No pudimos cargar el foro."
          body="Parece que no hay conexión. Revisa tu red y vuelve a intentarlo."
          actionLabel="Reintentar"
          onAction={() => feed.refetch()}
        />
      );
    }
    return <Message title="Todavía nadie ha dicho nada." />;
  }

  function renderFooter() {
    if (feed.isFetchingNextPage) {
      return <PostRowGhost />;
    }
    if (feed.isFetchNextPageError) {
      return (
        <Pressable accessibilityRole="button" onPress={() => feed.fetchNextPage()} style={styles.notice}>
          <Text variant="small" color="ink2">
            No pudimos cargar más. Toca para reintentar.
          </Text>
        </Pressable>
      );
    }
    // RN 0.88: las listas aceptan undefined (no null) para "sin pie"
    return undefined;
  }

  // Si ya hay publicaciones y algo falla después, las dejamos y avisamos en una línea.
  let notice: string | null = null;
  if (feed.isRefetchError) {
    notice = 'No pudimos actualizar el foro. Desliza hacia abajo para reintentar.';
  }
  if (postMenu.deleteErrorMessage) {
    notice = 'No pudimos eliminar tu publicación. ' + postMenu.deleteErrorMessage;
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.paper }]} edges={['top', 'bottom']}>
      <TopBar
        hasRule
        left={
          <Text variant="title" weight="semiBold" accessibilityRole="header">
            ForumMovil
          </Text>
        }
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tu perfil"
            // el ícono mide 24: así el área para tocar llega a 48
            hitSlop={space.s3}
            onPress={() => router.push('/perfil')}>
            <LineIcon name="person" />
          </Pressable>
        }
      />
      {notice ? (
        <Text variant="small" color="ink2" style={styles.notice} accessibilityRole="alert">
          {notice}
        </Text>
      ) : null}
      <FlatList
        data={posts}
        keyExtractor={(post) => String(post.id)}
        renderItem={({ item }) => (
          <PostRow
            post={item}
            isMine={item.author.id === myUserId}
            onOpen={openThread}
            onOpenMenu={(post) => postMenu.openPostMenu(post, { isMine: post.author.id === myUserId })}
            onOpenEdits={openEdits}
          />
        )}
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={renderFooter()}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
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
        <CreatePostDock
          // con el foro en error no hay a dónde volver después de publicar (foro-estados.elyx)
          disabled={feed.isError && posts.length === 0}
          onPress={() => router.push('/escribir')}
        />
      )}
      <ActionSheet sheet={postMenu.sheet} onClose={postMenu.closeSheet} />
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
});
