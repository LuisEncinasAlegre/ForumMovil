import { router } from 'expo-router';

import { blockedSheetContent } from '@/features/moderation/blockedSheet';
import { useMyBan } from '@/features/moderation/useMyBan';
import { useActionSheet, type ActionSheetState } from '@/ui/useActionSheet';

import { getPostErrorMessage } from './postErrorMessage';
import type { FeedPost } from './types';
import { useDeletePost } from './useDeletePost';

type PostMenuOptions = {
  // tus publicaciones se editan y eliminan; las de otros se reportan
  isMine: boolean;
  // en el hilo, después de eliminar volvemos al foro
  onDeleted?: () => void;
};

type PostMenu = {
  openPostMenu: (post: FeedPost, options: PostMenuOptions) => void;
  // lo que la pantalla muestra con <ActionSheet />
  sheet: ActionSheetState;
  closeSheet: () => void;
  deleteErrorMessage: string | null;
};

// Menú "⋯" de las publicaciones, en el foro y en el hilo. Sin título: ya sabes qué tocaste.
export function usePostMenu(): PostMenu {
  const deletePost = useDeletePost();
  const { ban } = useMyBan();
  const { sheet, openSheet, closeSheet } = useActionSheet();

  function confirmDelete(post: FeedPost, options: PostMenuOptions): void {
    openSheet({
      title: '¿Eliminar esta publicación?',
      message: 'Ya no aparecerá en el foro. No se puede deshacer.',
      actions: [
        {
          label: 'Eliminar',
          isDestructive: true,
          onPress: () => deletePost.mutate(post.id, { onSuccess: options.onDeleted }),
        },
      ],
    });
  }

  function openPostMenu(post: FeedPost, options: PostMenuOptions): void {
    if (ban) {
      openSheet(blockedSheetContent(ban));
      return;
    }
    if (!options.isMine) {
      openSheet({
        actions: [
          {
            label: 'Reportar',
            onPress: () => router.push({ pathname: '/reportar', params: { postId: String(post.id) } }),
          },
        ],
      });
      return;
    }
    openSheet({
      actions: [
        {
          label: 'Editar',
          onPress: () => router.push({ pathname: '/escribir', params: { postId: String(post.id) } }),
        },
        { label: 'Eliminar', isDestructive: true, onPress: () => confirmDelete(post, options) },
      ],
    });
  }

  return {
    openPostMenu,
    sheet,
    closeSheet,
    deleteErrorMessage: deletePost.error ? getPostErrorMessage(deletePost.error) : null,
  };
}
