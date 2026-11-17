import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMyCommentCount } from '@/features/comments/useMyCommentCount';
import { IdentityColorPicker } from '@/features/identity/IdentityColorPicker';
import { SealMark } from '@/features/identity/SealMark';
import { useColorChoice } from '@/features/identity/useColorChoice';
import { HiddenPostRow } from '@/features/posts/HiddenPostRow';
import { PostRow } from '@/features/posts/PostRow';
import { PostRowGhost } from '@/features/posts/PostRowGhost';
import type { FeedPost } from '@/features/posts/types';
import { useMyPostCount } from '@/features/posts/useMyPostCount';
import { useMyPosts } from '@/features/posts/useMyPosts';
import { usePostMenu } from '@/features/posts/usePostMenu';
import { useMyProfile } from '@/features/session/useMyProfile';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { ActionSheet } from '@/ui/ActionSheet';
import { BackButton } from '@/ui/BackButton';
import { Rule } from '@/ui/Rule';
import { SettingRow } from '@/ui/SettingRow';
import { Text } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';

const GHOST_FADES = [1, 0.6];

function openThread(post: FeedPost): void {
  router.push({ pathname: '/hilo/[id]', params: { id: String(post.id) } });
}

function openEdits(post: FeedPost): void {
  router.push({ pathname: '/ediciones', params: { postId: String(post.id) } });
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

// Perfil: tu sello, tu color, lo que has escrito y los ajustes (screens/perfil.elyx).
export default function PerfilScreen() {
  const theme = useTheme();
  const profileQuery = useMyProfile();
  const profile = profileQuery.data;
  const colorChoice = useColorChoice(profile);
  const myPosts = useMyPosts();
  const postCount = useMyPostCount();
  const commentCount = useMyCommentCount();
  const postMenu = usePostMenu();

  const posts = myPosts.data?.pages.flat() ?? [];

  function loadMore(): void {
    if (myPosts.hasNextPage && !myPosts.isFetchingNextPage && !myPosts.isFetchNextPageError) {
      myPosts.fetchNextPage();
    }
  }

  function renderCounts() {
    if (postCount.isError || commentCount.isError) {
      return (
        <Pressable
          accessibilityRole="button"
          hitSlop={space.s3}
          onPress={() => {
            postCount.refetch();
            commentCount.refetch();
          }}>
          <Text variant="small" color="ink2">
            No pudimos contarlas. Reintentar
          </Text>
        </Pressable>
      );
    }
    if (postCount.isPending || commentCount.isPending) {
      return (
        <Text variant="small" color="ink3" accessibilityLabel="Contando">
          …
        </Text>
      );
    }
    return (
      <Text variant="small" color="ink3">
        {formatCount(postCount.data, 'publicación', 'publicaciones')} ·{' '}
        {formatCount(commentCount.data, 'respuesta', 'respuestas')}
      </Text>
    );
  }

  function renderHeader() {
    return (
      <View>
        {profile ? (
          <View style={styles.who}>
            {/* lo que se ve mientras eliges, aunque todavía no se guarde */}
            <SealMark profile={{ ...profile, color: colorChoice.displayColor }} />
            <Text variant="title" weight="medium">
              {profile.display_name}
            </Text>
            <Text variant="ui" color="ink2">
              Este alias vive solo en este teléfono. Si borras la app, empiezas con otro.
            </Text>
            <IdentityColorPicker choice={colorChoice} />
          </View>
        ) : null}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text variant="small" weight="semiBold" color="ink2">
            Lo que has escrito
          </Text>
          {renderCounts()}
        </View>
      </View>
    );
  }

  function renderEmpty() {
    if (myPosts.isPending) {
      return (
        <View accessibilityLabel="Cargando tus publicaciones">
          {GHOST_FADES.map((fade) => (
            <PostRowGhost key={fade} fade={fade} />
          ))}
        </View>
      );
    }
    if (myPosts.isError) {
      return (
        <Pressable accessibilityRole="button" onPress={() => myPosts.refetch()} style={styles.line}>
          <Text variant="ui" color="ink2">
            No pudimos cargar tus publicaciones. Toca para reintentar.
          </Text>
        </Pressable>
      );
    }
    return (
      <View style={styles.line}>
        <Text variant="ui" color="ink2">
          Todavía no has publicado nada.
        </Text>
      </View>
    );
  }

  function renderFooter() {
    return (
      <View>
        {myPosts.isFetchingNextPage ? <PostRowGhost /> : null}
        {myPosts.isFetchNextPageError ? (
          <Pressable accessibilityRole="button" onPress={() => myPosts.fetchNextPage()} style={styles.line}>
            <Text variant="small" color="ink2">
              No pudimos cargar más. Toca para reintentar.
            </Text>
          </Pressable>
        ) : null}
        {posts.length === 0 ? (
          <View style={styles.inset}>
            <Rule />
          </View>
        ) : null}
        <SettingRow label="Reglas de la comunidad" onPress={() => router.push('/reglas')} />
        <SettingRow label="Privacidad" onPress={() => router.push('/privacidad')} />
      </View>
    );
  }

  // con tus publicaciones ya en pantalla, un error al actualizar se avisa en una línea
  let notice: string | null = null;
  if (myPosts.isRefetchError) {
    notice = 'No pudimos actualizar tus publicaciones. Vuelve a abrir Perfil para reintentar.';
  }
  if (postMenu.deleteErrorMessage) {
    notice = 'No pudimos eliminar tu publicación. ' + postMenu.deleteErrorMessage;
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.paper }]} edges={['top', 'bottom']}>
      <TopBar left={<BackButton />} title="Perfil" />
      {notice ? (
        <Text variant="small" color="ink2" style={styles.line} accessibilityRole="alert">
          {notice}
        </Text>
      ) : null}
      <FlatList
        data={posts}
        keyExtractor={(post) => String(post.id)}
        renderItem={({ item }) =>
          item.status === 'hidden' ? (
            <HiddenPostRow post={item} />
          ) : (
            <PostRow
              post={item}
              isMine
              isCompact
              onOpen={openThread}
              onOpenMenu={(post) => postMenu.openPostMenu(post, { isMine: true })}
              onOpenEdits={openEdits}
            />
          )
        }
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={renderFooter()}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
      />
      <ActionSheet sheet={postMenu.sheet} onClose={postMenu.closeSheet} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  who: {
    paddingTop: space.s3,
    paddingHorizontal: space.gutter,
    paddingBottom: space.s6,
    gap: space.s3,
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space.s3,
    paddingHorizontal: space.gutter,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  line: {
    paddingVertical: space.s5,
    paddingHorizontal: space.gutter,
  },
  inset: {
    paddingHorizontal: space.gutter,
  },
});
