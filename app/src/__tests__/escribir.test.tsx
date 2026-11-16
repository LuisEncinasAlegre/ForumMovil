import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';

import { createPost, fetchPost, updatePost } from '@/features/posts/api';
import { useMyProfile } from '@/features/session/useMyProfile';

import WriteScreen from '@/app/escribir';

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
  createPost: jest.fn(),
  updatePost: jest.fn(),
  fetchPost: jest.fn(),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const profile = {
  id: 'usuario-1',
  display_name: 'farol-veloz',
  color: null,
  rules_accepted_at: '2026-11-15T00:00:00Z',
  created_at: '2026-11-15T00:00:00Z',
};

const post = {
  id: 7,
  title: 'Con 43 grados',
  content: 'Hace calor.',
  status: 'visible',
  created_at: '2026-11-15T00:00:00Z',
  edited_at: null,
  author: { id: 'usuario-1', display_name: 'farol-veloz', color: null },
  replyCount: 0,
};

function renderWithQueryClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useMyProfile).mockReturnValue({ data: profile } as never);
});

describe('WriteScreen: publicación nueva', () => {
  beforeEach(() => {
    jest.mocked(useLocalSearchParams).mockReturnValue({});
  });

  test('Publicar se activa solo con título y texto válidos, y los contadores avanzan', async () => {
    const user = userEvent.setup();
    await renderWithQueryClient(<WriteScreen />);

    expect(screen.getByText('farol-veloz')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled();

    await user.type(screen.getByLabelText('Título'), 'Hola');
    expect(screen.getByText('4 / 120')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled();

    await user.type(screen.getByLabelText('Texto de la publicación'), 'Qué tal');
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled();
  });

  test('al publicar regresa al foro', async () => {
    jest.mocked(createPost).mockResolvedValue(post);
    const user = userEvent.setup();
    await renderWithQueryClient(<WriteScreen />);

    await user.type(screen.getByLabelText('Título'), 'Con 43 grados');
    await user.type(screen.getByLabelText('Texto de la publicación'), 'Hace calor.');
    await user.press(screen.getByRole('button', { name: 'Publicar' }));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(createPost).toHaveBeenCalledWith({ title: 'Con 43 grados', content: 'Hace calor.' });
  });

  test('si falla, se queda con el texto y explica qué pasó', async () => {
    jest.mocked(createPost).mockRejectedValue({ code: 'P0001', message: 'demasiadas_publicaciones' });
    const user = userEvent.setup();
    await renderWithQueryClient(<WriteScreen />);

    await user.type(screen.getByLabelText('Título'), 'Con 43 grados');
    await user.type(screen.getByLabelText('Texto de la publicación'), 'Hace calor.');
    await user.press(screen.getByRole('button', { name: 'Publicar' }));

    expect(await screen.findByText(/Vas muy rápido/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Título')).toHaveDisplayValue('Con 43 grados');
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('WriteScreen: editar', () => {
  beforeEach(() => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ postId: '7' });
  });

  test('carga la publicación y Guardar se activa cuando algo cambia', async () => {
    jest.mocked(fetchPost).mockResolvedValue(post);
    jest.mocked(updatePost).mockResolvedValue({ ...post, content: 'Hace mucho calor.' });
    const user = userEvent.setup();
    await renderWithQueryClient(<WriteScreen />);

    expect(await screen.findByDisplayValue('Con 43 grados')).toBeOnTheScreen();
    expect(screen.getByText('Editas como')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();

    await user.type(screen.getByLabelText('Texto de la publicación'), ' Mucho.');
    await user.press(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(updatePost).toHaveBeenCalledWith(7, { title: 'Con 43 grados', content: 'Hace calor. Mucho.' });
  });

  test('si ya no se puede editar lo dice', async () => {
    jest.mocked(fetchPost).mockResolvedValue(null);
    await renderWithQueryClient(<WriteScreen />);

    expect(await screen.findByText('Esta publicación ya no se puede editar.')).toBeOnTheScreen();
  });
});
