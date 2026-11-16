import { Alert } from 'react-native';

import { getCommentErrorMessage } from './commentErrorMessage';
import type { ThreadComment } from './types';
import { useDeleteComment } from './useDeleteComment';

type CommentMenuOptions = {
  // editar pasa en el muelle de abajo, no en otra pantalla
  onEdit: (comment: ThreadComment) => void;
};

type CommentMenu = {
  openCommentMenu: (comment: ThreadComment) => void;
  deleteErrorMessage: string | null;
};

// Menú "⋯" de tus respuestas. Igual que el de publicaciones: Alert con tres botones.
export function useCommentMenu({ onEdit }: CommentMenuOptions): CommentMenu {
  const deleteComment = useDeleteComment();

  function confirmDelete(comment: ThreadComment): void {
    Alert.alert('¿Eliminar esta respuesta?', 'Ya no aparecerá en el hilo. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteComment.mutate(comment.id) },
    ]);
  }

  function openCommentMenu(comment: ThreadComment): void {
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
