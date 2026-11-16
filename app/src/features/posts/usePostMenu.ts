import { router } from 'expo-router';
import { Alert } from 'react-native';

import { getPostErrorMessage } from './postErrorMessage';
import type { FeedPost } from './types';
import { useDeletePost } from './useDeletePost';

type PostMenuOptions = {
  // en el hilo, después de eliminar volvemos al foro
  onDeleted?: () => void;
};

type PostMenu = {
  openPostMenu: (post: FeedPost, options?: PostMenuOptions) => void;
  deleteErrorMessage: string | null;
};

// Menú "⋯" de tus publicaciones. Usamos Alert porque @expo/ui no tiene un menú para
// iOS y Android en el SDK 57, y Alert permite justo tres botones en Android.
export function usePostMenu(): PostMenu {
  const deletePost = useDeletePost();

  function confirmDelete(post: FeedPost, options?: PostMenuOptions): void {
    Alert.alert('¿Eliminar esta publicación?', 'Ya no aparecerá en el foro. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deletePost.mutate(post.id, { onSuccess: options?.onDeleted }),
      },
    ]);
  }

  function openPostMenu(post: FeedPost, options?: PostMenuOptions): void {
    Alert.alert(post.title, undefined, [
      {
        text: 'Editar',
        onPress: () => router.push({ pathname: '/escribir', params: { postId: String(post.id) } }),
      },
      { text: 'Eliminar', style: 'destructive', onPress: () => confirmDelete(post, options) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  return {
    openPostMenu,
    deleteErrorMessage: deletePost.error ? getPostErrorMessage(deletePost.error) : null,
  };
}
