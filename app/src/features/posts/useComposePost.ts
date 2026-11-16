import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, BackHandler } from 'react-native';

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
};

// Lógica de la pantalla Escribir, para publicar o para editar.
export function useComposePost({ postId, initialDraft }: ComposePostOptions): ComposePostState {
  const [title, setTitle] = useState(initialDraft.title);
  const [content, setContent] = useState(initialDraft.content);
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();

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

  // Cerrar con cambios sin guardar pregunta primero. (usePreventRemove llega hasta el SDK 58.)
  function cancel(): void {
    if (!hasChanges) {
      router.back();
      return;
    }
    Alert.alert('¿Descartar los cambios?', 'Lo que escribiste no se va a guardar.', [
      { text: 'Seguir escribiendo', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  // Botón "atrás" de Android: misma pregunta que "Cancelar".
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!hasChanges) {
        return false;
      }
      Alert.alert('¿Descartar los cambios?', 'Lo que escribiste no se va a guardar.', [
        { text: 'Seguir escribiendo', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => router.back() },
      ]);
      return true;
    });
    return () => subscription.remove();
  }, [hasChanges]);

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
  };
}
