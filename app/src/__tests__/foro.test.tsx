import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useMyBan } from '@/features/moderation/useMyBan';
import { useFeed } from '@/features/posts/useFeed';
import { usePostMenu } from '@/features/posts/usePostMenu';
import { useMyProfile } from '@/features/session/useMyProfile';

import ForoScreen from '@/app/index';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/features/posts/useFeed', () => ({ useFeed: jest.fn() }));
jest.mock('@/features/posts/usePostMenu', () => ({ usePostMenu: jest.fn() }));
jest.mock('@/features/session/useMyProfile', () => ({ useMyProfile: jest.fn() }));
// el aviso de moderación se prueba aparte
jest.mock('@/features/moderation/useShowNoticeOnFocus', () => ({ useShowNoticeOnFocus: jest.fn() }));
jest.mock('@/features/moderation/useShowBanOnFocus', () => ({ useShowBanOnFocus: jest.fn(() => false) }));
jest.mock('@/features/moderation/useMyBan', () => ({ useMyBan: jest.fn() }));

const profile = {
  id: 'usuario-1',
  display_name: 'farol-veloz',
  color: null,
  rules_accepted_at: '2026-11-15T00:00:00Z',
};

const post = {
  id: 7,
  title: 'Con 43 grados',
  content: 'Hace calor.',
  created_at: '2026-11-15T00:00:00Z',
  edited_at: null,
  author: { id: 'otra-persona', display_name: 'nube-libre', color: null, restriction: null },
  replyCount: 14,
};

type FeedState = {
  isPending?: boolean;
  isError?: boolean;
  posts?: (typeof post)[];
};

function mockFeed({ isPending = false, isError = false, posts }: FeedState) {
  const feed = {
    data: posts ? { pages: [posts], pageParams: [null] } : undefined,
    isPending,
    isError,
    isRefetchError: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    hasNextPage: false,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
  };
  jest.mocked(useFeed).mockReturnValue(feed as never);
  return feed;
}

beforeEach(() => {
  jest.mocked(useMyProfile).mockReturnValue({ data: profile } as never);
  jest.mocked(usePostMenu).mockReturnValue({ openPostMenu: jest.fn(), deleteErrorMessage: null });
  jest.mocked(useMyBan).mockReturnValue({ ban: null, isPending: false, isError: false, refetch: jest.fn() });
});

describe('ForoScreen', () => {
  test('mientras carga muestra filas fantasma', async () => {
    mockFeed({ isPending: true });
    await render(<ForoScreen />);

    expect(screen.getByLabelText('Cargando el foro')).toBeOnTheScreen();
  });

  test('sin publicaciones muestra el foro vacío', async () => {
    mockFeed({ posts: [] });
    await render(<ForoScreen />);

    expect(screen.getByText('Todavía nadie ha dicho nada.')).toBeOnTheScreen();
  });

  test('con error deja reintentar y no deja crear', async () => {
    const feed = mockFeed({ isError: true });
    const user = userEvent.setup();
    await render(<ForoScreen />);

    expect(screen.getByText('No pudimos cargar el foro.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Crear publicación' })).toBeDisabled();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(feed.refetch).toHaveBeenCalled();
  });

  test('muestra las publicaciones y "Crear publicación" abre Escribir', async () => {
    mockFeed({ posts: [post] });
    const user = userEvent.setup();
    await render(<ForoScreen />);

    expect(screen.getByText('Con 43 grados')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Crear publicación' }));
    expect(router.push).toHaveBeenCalledWith('/escribir');
  });

  test('tocar una publicación abre su hilo y se ve cuántas respuestas tiene', async () => {
    mockFeed({ posts: [post] });
    const user = userEvent.setup();
    await render(<ForoScreen />);

    expect(screen.getByText('14 respuestas')).toBeOnTheScreen();
    await user.press(screen.getByText('Con 43 grados'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/hilo/[id]', params: { id: '7' } });
  });

  test('sin respuestas no se muestra la línea de respuestas', async () => {
    mockFeed({ posts: [{ ...post, replyCount: 0 }] });
    await render(<ForoScreen />);

    expect(screen.queryByText(/respuesta/)).toBeNull();
  });

  test('todas las publicaciones tienen menú y el foro le dice cuál es mía', async () => {
    const openPostMenu = jest.fn();
    jest.mocked(usePostMenu).mockReturnValue({ openPostMenu, deleteErrorMessage: null });
    const mine = { ...post, id: 8, title: 'La mía', author: { id: 'usuario-1', display_name: 'farol-veloz', color: null, restriction: null } };
    mockFeed({ posts: [mine, post] });
    const user = userEvent.setup();
    await render(<ForoScreen />);

    await user.press(screen.getByRole('button', { name: 'Opciones de tu publicación' }));
    await user.press(screen.getByRole('button', { name: 'Opciones de la publicación' }));

    expect(openPostMenu).toHaveBeenNthCalledWith(1, mine, { isMine: true });
    expect(openPostMenu).toHaveBeenNthCalledWith(2, post, { isMine: false });
  });

  test('con la cuenta suspendida no se puede crear y "Ver por qué" explica la suspensión', async () => {
    jest.mocked(useMyBan).mockReturnValue({
      ban: { reason: 'Insultaste a otras personas.', endsAt: '2026-11-20T14:30:00Z' },
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    });
    mockFeed({ posts: [post] });
    const user = userEvent.setup();
    await render(<ForoScreen />);

    expect(screen.queryByRole('button', { name: 'Crear publicación' })).toBeNull();
    expect(screen.getByText('Tu cuenta está suspendida')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Ver por qué' }));
    expect(router.push).toHaveBeenCalledWith('/suspendida');
  });

  test('tu sello abre tu perfil', async () => {
    mockFeed({ posts: [] });
    const user = userEvent.setup();
    await render(<ForoScreen />);

    await user.press(screen.getByRole('button', { name: 'Tu perfil' }));
    expect(router.push).toHaveBeenCalledWith('/perfil');
  });
});
