import { router } from 'expo-router';

import { blockedSheetContent } from '@/features/moderation/blockedSheet';
import { useMyBan } from '@/features/moderation/useMyBan';
import { useActionSheet, type ActionSheetState } from '@/ui/useActionSheet';

import { getCommentErrorMessage } from './commentErrorMessage';
import type { ThreadComment } from './types';
import { useDeleteComment } from './useDeleteComment';

type CommentMenuOptions = {
  // editar pasa en el muelle de abajo, no en otra pantalla
  onEdit: (comment: ThreadComment) => void;
};

type CommentMenu = {
  openCommentMenu: (comment: ThreadComment, isMine: boolean) => void;
  // lo que la pantalla muestra con <ActionSheet />
  sheet: ActionSheetState;
  closeSheet: () => void;
  deleteErrorMessage: string | null;
};

// Menú "⋯" de las respuestas. Igual que el de publicaciones: las tuyas se editan y eliminan,
// las de otros se reportan.
export function useCommentMenu({ onEdit }: CommentMenuOptions): CommentMenu {
  const deleteComment = useDeleteComment();
  const { ban } = useMyBan();
  const { sheet, openSheet, closeSheet } = useActionSheet();

  function confirmDelete(comment: ThreadComment): void {
    openSheet({
      title: '¿Eliminar esta respuesta?',
      message: 'Ya no aparecerá en el hilo. No se puede deshacer.',
      actions: [{ label: 'Eliminar', isDestructive: true, onPress: () => deleteComment.mutate(comment.id) }],
    });
  }

  function openCommentMenu(comment: ThreadComment, isMine: boolean): void {
    if (ban) {
      openSheet(blockedSheetContent(ban));
      return;
    }
    if (!isMine) {
      openSheet({
        actions: [
          {
            label: 'Reportar',
            onPress: () => router.push({ pathname: '/reportar', params: { commentId: String(comment.id) } }),
          },
        ],
      });
      return;
    }
    openSheet({
      actions: [
        { label: 'Editar', onPress: () => onEdit(comment) },
        { label: 'Eliminar', isDestructive: true, onPress: () => confirmDelete(comment) },
      ],
    });
  }

  return {
    openCommentMenu,
    sheet,
    closeSheet,
    deleteErrorMessage: deleteComment.error ? getCommentErrorMessage(deleteComment.error) : null,
  };
}
