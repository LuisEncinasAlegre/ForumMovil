import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

import { useActionSheet, type ActionSheetState } from '@/ui/useActionSheet';

import { getPostErrorMessage } from './postErrorMessage';
import type { PostDraft } from './types';
import { useCreatePost } from './useCreatePost';
import { useUpdatePost } from './useUpdatePost';
import { countCharacters, isPostDraftValid } from './validation';

type ComposePostOptions = {
  // null = publicación nueva; un id = editar esa publicación
  postId: number | null;
  initialDraft: PostDraft;
};

export type ComposePostState = {
  isEditing: boolean;
  title: string;
  setTitle: (title: string) => void;
  content: string;
  setContent: (content: string) => void;
  titleLength: number;
  contentLength: number;
  canSubmit: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  submit: () => Promise<void>;
  cancel: () => void;
  // la pregunta de descartar cambios (ui/ActionSheet)
  discardSheet: ActionSheetState;
  closeDiscardSheet: () => void;
};

// Lógica de la pantalla Escribir, para publicar o para editar.
export function useComposePost({ postId, initialDraft }: ComposePostOptions): ComposePostState {
  const [title, setTitle] = useState(initialDraft.title);
  const [content, setContent] = useState(initialDraft.content);
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const { sheet: discardSheet, openSheet, closeSheet: closeDiscardSheet } = useActionSheet();

  const isEditing = postId !== null;
  const mutation = isEditing ? updatePost : createPost;
  const hasChanges = title !== initialDraft.title || content !== initialDraft.content;
  const isSaving = mutation.isPending;
  const canSubmit = isPostDraftValid({ title, content }) && hasChanges && !isSaving;

  async function submit(): Promise<void> {
    if (!canSubmit) {
      return;
    }
    try {
      if (postId === null) {
        await createPost.mutateAsync({ title, content });
        // la vibración es un extra: si el teléfono no la soporta, igual se publicó
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        await updatePost.mutateAsync({ postId, draft: { title, content } });
      }
      router.back();
    } catch {
      // el error queda en la mutación y la pantalla lo muestra en errorMessage; el texto no se pierde
    }
  }

  function askToDiscard(): void {
    openSheet({
      title: '¿Descartar los cambios?',
      message: 'Lo que escribiste no se va a guardar.',
      actions: [{ label: 'Descartar', isDestructive: true, onPress: () => router.back() }],
    });
  }

  // Cerrar con cambios sin guardar pregunta primero. (usePreventRemove llega hasta el SDK 58.)
  // Mientras se guarda no se puede cerrar: al terminar, submit ya vuelve atrás por su cuenta.
  function cancel(): void {
    if (isSaving) {
      return;
    }
    if (!hasChanges) {
      router.back();
      return;
    }
    askToDiscard();
  }

  // Botón "atrás" de Android: misma pregunta que "Cancelar".
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isSaving) {
        return true;
      }
      if (!hasChanges) {
        return false;
      }
      askToDiscard();
      return true;
    });
    return () => subscription.remove();
  });

  return {
    isEditing,
    title,
    setTitle,
    content,
    setContent,
    titleLength: countCharacters(title),
    contentLength: countCharacters(content),
    canSubmit,
    isSaving,
    errorMessage: mutation.error ? getPostErrorMessage(mutation.error) : null,
    submit,
    cancel,
    discardSheet,
    closeDiscardSheet,
  };
}
