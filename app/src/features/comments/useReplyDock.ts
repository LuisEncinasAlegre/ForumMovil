import * as Haptics from 'expo-haptics';
import { useState } from 'react';

import { getCommentErrorMessage } from './commentErrorMessage';
import type { ThreadComment } from './types';
import { useCreateComment } from './useCreateComment';
import { useUpdateComment } from './useUpdateComment';
import { isCommentValid } from './validation';

export type ReplyDockState = {
  text: string;
  setText: (text: string) => void;
  // null = respondiendo; una respuesta = editando esa respuesta tuya
  editingComment: ThreadComment | null;
  startEditing: (comment: ThreadComment) => void;
  cancelEditing: () => void;
  canSend: boolean;
  isSending: boolean;
  // el texto que se está enviando, para mostrarlo tenue al final del hilo
  pendingReply: string | null;
  errorMessage: string | null;
  send: () => Promise<void>;
};

// Lógica del muelle de abajo del hilo: responder, o editar una respuesta tuya.
export function useReplyDock(postId: number): ReplyDockState {
  const [text, setText] = useState('');
  const [editingComment, setEditingComment] = useState<ThreadComment | null>(null);
  // lo que llevabas escrito antes de editar, para devolvértelo al terminar
  const [replyTextBeforeEditing, setReplyTextBeforeEditing] = useState('');
  const createComment = useCreateComment(postId);
  const updateComment = useUpdateComment();

  const isSending = createComment.isPending || updateComment.isPending;
  const hasChanges = editingComment === null || text.trim() !== editingComment.content;
  const canSend = isCommentValid(text) && hasChanges && !isSending;
  const activeError = editingComment === null ? createComment.error : updateComment.error;

  function startEditing(comment: ThreadComment): void {
    createComment.reset();
    updateComment.reset();
    if (editingComment === null) {
      setReplyTextBeforeEditing(text);
    }
    setEditingComment(comment);
    setText(comment.content);
  }

  function finishEditing(): void {
    setEditingComment(null);
    setText(replyTextBeforeEditing);
    setReplyTextBeforeEditing('');
  }

  function cancelEditing(): void {
    updateComment.reset();
    finishEditing();
  }

  async function sendReply(): Promise<void> {
    const content = text;
    // el campo se vacía de una vez; la respuesta se ve tenue en el hilo mientras se envía
    setText('');
    try {
      await createComment.mutateAsync(content);
      // la vibración es un extra: si el teléfono no la soporta, igual se envió
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      // el error queda en la mutación; devolvemos el texto si no escribiste otra cosa mientras
      setText((current) => (current === '' ? content : current));
    }
  }

  async function saveEdit(comment: ThreadComment): Promise<void> {
    try {
      await updateComment.mutateAsync({ commentId: comment.id, content: text });
      finishEditing();
    } catch {
      // el error queda en la mutación y el texto sigue en el campo
    }
  }

  async function send(): Promise<void> {
    if (!canSend) {
      return;
    }
    if (editingComment === null) {
      await sendReply();
      return;
    }
    await saveEdit(editingComment);
  }

  return {
    text,
    setText,
    editingComment,
    startEditing,
    cancelEditing,
    canSend,
    isSending,
    pendingReply: createComment.isPending ? createComment.variables : null,
    errorMessage: activeError ? getCommentErrorMessage(activeError) : null,
    send,
  };
}
