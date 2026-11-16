import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';

import { createComment, fetchCommentsPage, updateComment } from '@/features/comments/api';
import { fetchPost } from '@/features/posts/api';
import { useMyProfile } from '@/features/session/useMyProfile';

import ThreadScreen from '@/app/hilo/[id]';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => {}),
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('@/features/session/useMyProfile', () => ({ useMyProfile: jest.fn() }));
jest.mock('@/features/posts/api', () => ({
  ...jest.requireActual('@/features/posts/api'),
  fetchPost: jest.fn(),
}));
jest.mock('@/features/comments/api', () => ({
  ...jest.requireActual('@/features/comments/api'),
  fetchCommentsPage: jest.fn(),
  createComment: jest.fn(),
  updateComment: jest.fn(),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const me = {
  id: 'usuario-1',
  display_name: 'farol-veloz',
  color: null,
  rules_accepted_at: '2026-11-15T00:00:00Z',
  created_at: '2026-11-15T00:00:00Z',
};

const otherAuthor = { id: 'otra-persona', display_name: 'nube-libre', color: null };

const post = {
  id: 7,
  title: '¿Alguien más siente que Cálculo III está diseñado para tronarnos?',
  content: 'Llevo tres semanas sin dormir bien.',
  status: 'visible',
  created_at: '2026-11-16T00:00:00Z',
  edited_at: null,
  author: otherAuthor,
  replyCount: 1,
};

const theirReply = {
  id: 30,
  post_id: 7,
  content: 'A mí me pasó igual el semestre pasado.',
  created_at: '2026-11-16T00:01:00Z',
  edited_at: null,
  author: otherAuthor,
};

const myReply = {
  id: 31,
  post_id: 7,
  content: '¿Las de los martes en el 5K?',
  created_at: '2026-11-16T00:02:00Z',
  edited_at: null,
  author: { id: me.id, display_name: me.display_name, color: null },
};

function renderWithQueryClient(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } },
  });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: '7' });
  jest.mocked(useMyProfile).mockReturnValue({ data: me } as never);
});

describe('ThreadScreen', () => {
  test('muestra la publicación completa, el número de respuestas y las respuestas con "autor"', async () => {
    jest.mocked(fetchPost).mockResolvedValue(post);
    jest.mocked(fetchCommentsPage).mockResolvedValue([theirReply]);
    await renderWithQueryClient(<ThreadScreen />);

    expect(await screen.findByText(post.title)).toBeOnTheScreen();
    expect(screen.getByText('Llevo tres semanas sin dormir bien.')).toBeOnTheScreen();
    expect(screen.getByText('1 respuesta')).toBeOnTheScreen();
    expect(await screen.findByText(theirReply.content)).toBeOnTheScreen();
    expect(screen.getByText('autor')).toBeOnTheScreen();
    // no es mi publicación: el menú de arriba es para reportar
    expect(screen.queryByRole('button', { name: 'Opciones de tu publicación' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Opciones de la publicación' })).toBeOnTheScreen();
  });

  test('sin respuestas invita a responder', async () => {
    jest.mocked(fetchPost).mockResolvedValue({ ...post, replyCount: 0 });
    jest.mocked(fetchCommentsPage).mockResolvedValue([]);
    await renderWithQueryClient(<ThreadScreen />);

    expect(await screen.findByText('Nadie ha respondido todavía.')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('Responde como farol-veloz')).toBeOnTheScreen();
  });

  test('si la publicación ya no está, no hay muelle para responder', async () => {
    jest.mocked(fetchPost).mockResolvedValue(null);
    jest.mocked(fetchCommentsPage).mockResolvedValue([]);
    await renderWithQueryClient(<ThreadScreen />);

    expect(await screen.findByText('Esta publicación ya no está.')).toBeOnTheScreen();
    expect(screen.queryByPlaceholderText('Responde como farol-veloz')).toBeNull();
  });

  test('al enviar, el campo se vacía y la respuesta se ve tenue hasta que llega', async () => {
    jest.mocked(fetchPost).mockResolvedValue(post);
    jest.mocked(fetchCommentsPage).mockResolvedValue([]);
    let finishCreate: (value: typeof myReply) => void = () => {};
    jest.mocked(createComment).mockReturnValue(new Promise((resolve) => (finishCreate = resolve)));
    const user = userEvent.setup();
    await renderWithQueryClient(<ThreadScreen />);

    const send = await screen.findByRole('button', { name: 'Enviar respuesta' });
    expect(send).toBeDisabled();
    await user.type(screen.getByPlaceholderText('Responde como farol-veloz'), 'Siguen, a las 4.');
    await user.press(send);

    expect(createComment).toHaveBeenCalledWith(7, 'Siguen, a las 4.');
    expect(screen.getByPlaceholderText('Responde como farol-veloz')).toHaveDisplayValue('');
    expect(await screen.findByText('enviando…')).toBeOnTheScreen();

    jest.mocked(fetchCommentsPage).mockResolvedValue([{ ...myReply, content: 'Siguen, a las 4.' }]);
    finishCreate({ ...myReply, content: 'Siguen, a las 4.' });
    await waitFor(() => expect(screen.queryByText('enviando…')).toBeNull());
    expect(screen.getByText('Siguen, a las 4.')).toBeOnTheScreen();
  });

  test('si falla, el texto vuelve al campo con un mensaje', async () => {
    jest.mocked(fetchPost).mockResolvedValue(post);
    jest.mocked(fetchCommentsPage).mockResolvedValue([]);
    jest.mocked(createComment).mockRejectedValue({ code: 'P0001', message: 'demasiadas_respuestas' });
    const user = userEvent.setup();
    await renderWithQueryClient(<ThreadScreen />);

    await user.type(await screen.findByPlaceholderText('Responde como farol-veloz'), 'Otra más');
    await user.press(screen.getByRole('button', { name: 'Enviar respuesta' }));

    expect(await screen.findByText('Vas muy rápido. Espera un minuto antes de responder otra vez.')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('Responde como farol-veloz')).toHaveDisplayValue('Otra más');
  });

  test('editar una respuesta mía la pone en el muelle y guarda con updateComment', async () => {
    jest.mocked(fetchPost).mockResolvedValue(post);
    jest.mocked(fetchCommentsPage).mockResolvedValue([myReply]);
    jest.mocked(updateComment).mockResolvedValue({ ...myReply, content: '¿Las de los martes en el 5K? Gracias.' });
    // el menú es un Alert nativo: tocamos "Editar" directamente
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.text === 'Editar')?.onPress?.();
    });
    const user = userEvent.setup();
    await renderWithQueryClient(<ThreadScreen />);

    await user.press(await screen.findByRole('button', { name: 'Opciones de tu respuesta' }));
    expect(screen.getByText('Editando tu respuesta')).toBeOnTheScreen();
    const field = screen.getByLabelText('Texto de tu respuesta');
    expect(field).toHaveDisplayValue(myReply.content);
    // sin cambios no se puede guardar
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();

    await user.type(field, ' Gracias.');
    await user.press(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(updateComment).toHaveBeenCalledWith(31, '¿Las de los martes en el 5K? Gracias.');
    await waitFor(() => expect(screen.queryByText('Editando tu respuesta')).toBeNull());
    alertSpy.mockRestore();
  });

  test('en mi publicación hay menú arriba', async () => {
    jest.mocked(fetchPost).mockResolvedValue({ ...post, author: myReply.author });
    jest.mocked(fetchCommentsPage).mockResolvedValue([]);
    await renderWithQueryClient(<ThreadScreen />);

    expect(await screen.findByRole('button', { name: 'Opciones de tu publicación' })).toBeOnTheScreen();
  });

  test('en la publicación de otra persona, el menú de arriba lleva a Reportar', async () => {
    jest.mocked(fetchPost).mockResolvedValue(post);
    jest.mocked(fetchCommentsPage).mockResolvedValue([]);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      expect(buttons?.map((button) => button.text)).toEqual(['Reportar', 'Cancelar']);
      buttons?.find((button) => button.text === 'Reportar')?.onPress?.();
    });
    const user = userEvent.setup();
    await renderWithQueryClient(<ThreadScreen />);

    await user.press(await screen.findByRole('button', { name: 'Opciones de la publicación' }));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/reportar', params: { postId: '7' } });
    alertSpy.mockRestore();
  });

  test('la respuesta de otra persona tiene menú para reportarla', async () => {
    jest.mocked(fetchPost).mockResolvedValue(post);
    jest.mocked(fetchCommentsPage).mockResolvedValue([theirReply]);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      expect(buttons?.map((button) => button.text)).toEqual(['Reportar', 'Cancelar']);
      buttons?.find((button) => button.text === 'Reportar')?.onPress?.();
    });
    const user = userEvent.setup();
    await renderWithQueryClient(<ThreadScreen />);

    await user.press(await screen.findByRole('button', { name: 'Opciones de la respuesta' }));

    expect(alertSpy).toHaveBeenCalledWith('Respuesta de nube-libre', undefined, expect.any(Array));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/reportar', params: { commentId: '30' } });
    alertSpy.mockRestore();
  });
});
