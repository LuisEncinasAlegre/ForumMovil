import { router } from 'expo-router';
import { Alert } from 'react-native';

import { showBlockedAlert } from '@/features/moderation/showBlockedAlert';
import { useMyBan } from '@/features/moderation/useMyBan';

import { getCommentErrorMessage } from './commentErrorMessage';
import type { ThreadComment } from './types';
import { useDeleteComment } from './useDeleteComment';

type CommentMenuOptions = {
  // editar pasa en el muelle de abajo, no en otra pantalla
  onEdit: (comment: ThreadComment) => void;
};

type CommentMenu = {
  openCommentMenu: (comment: ThreadComment, isMine: boolean) => void;
  deleteErrorMessage: string | null;
};

// Menú "⋯" de las respuestas. Igual que el de publicaciones: las tuyas se editan y eliminan,
// las de otros se reportan.
export function useCommentMenu({ onEdit }: CommentMenuOptions): CommentMenu {
  const deleteComment = useDeleteComment();
  const { ban } = useMyBan();

  function confirmDelete(comment: ThreadComment): void {
    Alert.alert('¿Eliminar esta respuesta?', 'Ya no aparecerá en el hilo. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteComment.mutate(comment.id) },
    ]);
  }

  function openCommentMenu(comment: ThreadComment, isMine: boolean): void {
    if (ban) {
      showBlockedAlert(ban);
      return;
    }
    if (!isMine) {
      Alert.alert('Respuesta de ' + comment.author.display_name, undefined, [
        {
          text: 'Reportar',
          onPress: () => router.push({ pathname: '/reportar', params: { commentId: String(comment.id) } }),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]);
      return;
    }
    Alert.alert('Tu respuesta', undefined, [
      { text: 'Editar', onPress: () => onEdit(comment) },
      { text: 'Eliminar', style: 'destructive', onPress: () => confirmDelete(comment) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  return {
    openCommentMenu,
    deleteErrorMessage: deleteComment.error ? getCommentErrorMessage(deleteComment.error) : null,
  };
}
