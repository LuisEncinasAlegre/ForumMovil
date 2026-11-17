import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useMyCommentCount } from '@/features/comments/useMyCommentCount';
import { useMyPostCount } from '@/features/posts/useMyPostCount';
import { useMyPosts } from '@/features/posts/useMyPosts';
import { usePostMenu } from '@/features/posts/usePostMenu';
import { useMyProfile } from '@/features/session/useMyProfile';
import { useUpdateMyColor } from '@/features/session/useUpdateMyColor';
import { identityColors } from '@/theme/tokens';

import PerfilScreen from '@/app/perfil';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/features/session/useMyProfile', () => ({ useMyProfile: jest.fn() }));
jest.mock('@/features/session/useUpdateMyColor', () => ({ useUpdateMyColor: jest.fn() }));
jest.mock('@/features/posts/useMyPosts', () => ({ useMyPosts: jest.fn() }));
jest.mock('@/features/posts/useMyPostCount', () => ({ useMyPostCount: jest.fn() }));
jest.mock('@/features/comments/useMyCommentCount', () => ({ useMyCommentCount: jest.fn() }));
jest.mock('@/features/posts/usePostMenu', () => ({ usePostMenu: jest.fn() }));
// el selector nativo de iOS no existe en Jest
jest.mock('@expo/ui/swift-ui', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Host: View,
    ColorPicker: ({ label }: { label?: string }) => <View testID="selector" accessibilityLabel={label} />,
  };
});

const profile = {
  id: 'usuario-1',
  display_name: 'farol-veloz',
  color: identityColors.anil,
  rules_accepted_at: '2026-11-15T00:00:00Z',
};

const myPost = {
  id: 7,
  title: '¿Alguien más siente que Cálculo III está diseñado para tronarnos?',
  content: 'Llevo tres semanas sin dormir.',
  created_at: '2026-11-15T00:00:00Z',
  edited_at: null,
  status: 'visible',
  author: { id: 'usuario-1', display_name: 'farol-veloz', color: identityColors.anil },
  replyCount: 14,
};

type ListState = { isPending?: boolean; isError?: boolean; posts?: (typeof myPost)[] };

function mockList({ isPending = false, isError = false, posts }: ListState) {
  const list = {
    data: posts ? { pages: [posts], pageParams: [null] } : undefined,
    isPending,
    isError,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    hasNextPage: false,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
  };
  jest.mocked(useMyPosts).mockReturnValue(list as never);
  return list;
}

let mutate: jest.Mock;
let openPostMenu: jest.Mock;

beforeEach(() => {
  mutate = jest.fn();
  openPostMenu = jest.fn();
  jest.mocked(useMyProfile).mockReturnValue({ data: profile } as never);
  jest.mocked(useUpdateMyColor).mockReturnValue({ mutate, isError: false, error: null } as never);
  jest.mocked(useMyPostCount).mockReturnValue({ isPending: false, data: 4 } as never);
  jest.mocked(useMyCommentCount).mockReturnValue({ isPending: false, data: 1 } as never);
  jest.mocked(usePostMenu).mockReturnValue({ openPostMenu, deleteErrorMessage: null });
});

describe('PerfilScreen', () => {
  test('muestra tu alias, tu color y cuánto has escrito', async () => {
    mockList({ posts: [myPost] });
    await render(<PerfilScreen />);

    expect(screen.getByRole('header', { name: 'Perfil' })).toBeOnTheScreen();
    // el alias va arriba y en tu publicación
    expect(screen.getAllByText('farol-veloz')).toHaveLength(2);
    expect(screen.getByText('Tu color · Azul')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Azul', checked: true })).toBeOnTheScreen();
    expect(screen.getByText('4 publicaciones · 1 respuesta')).toBeOnTheScreen();
    // fila compacta: sin el extracto
    expect(screen.getByText(myPost.title)).toBeOnTheScreen();
    expect(screen.queryByText(myPost.content)).toBeNull();
  });

  test('tocar un color lo guarda sin pedir confirmación', async () => {
    mockList({ posts: [] });
    const user = userEvent.setup();
    await render(<PerfilScreen />);

    await user.press(screen.getByRole('radio', { name: 'Salvia' }));

    // el cambio en pantalla lo hace la caché (probado en useUpdateMyColor)
    expect(mutate).toHaveBeenCalledWith(identityColors.salvia, expect.anything());
  });

  test('"Propio" muestra el selector del sistema ahí mismo', async () => {
    mockList({ posts: [] });
    const user = userEvent.setup();
    await render(<PerfilScreen />);

    await user.press(screen.getByRole('radio', { name: 'Propio' }));

    expect(screen.getByLabelText('Elegir color')).toBeOnTheScreen();
    expect(screen.getByText('Tu color · Propio')).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
  });

  test('si no se pudo guardar el color lo dice', async () => {
    mockList({ posts: [] });
    jest.mocked(useUpdateMyColor).mockReturnValue({ mutate, isError: true, error: new Error('x') } as never);
    await render(<PerfilScreen />);

    expect(screen.getByText('No pudimos guardar tu color. Inténtalo otra vez.')).toBeOnTheScreen();
  });

  test('mientras carga: conteos con … y filas fantasma', async () => {
    mockList({ isPending: true });
    jest.mocked(useMyPostCount).mockReturnValue({ isPending: true } as never);
    await render(<PerfilScreen />);

    expect(screen.getByText('…')).toBeOnTheScreen();
    expect(screen.getByLabelText('Cargando tus publicaciones')).toBeOnTheScreen();
  });

  test('sin publicaciones lo dice', async () => {
    mockList({ posts: [] });
    await render(<PerfilScreen />);

    expect(screen.getByText('Todavía no has publicado nada.')).toBeOnTheScreen();
  });

  test('con error deja reintentar', async () => {
    const list = mockList({ isError: true });
    const user = userEvent.setup();
    await render(<PerfilScreen />);

    await user.press(screen.getByText('No pudimos cargar tus publicaciones. Toca para reintentar.'));
    expect(list.refetch).toHaveBeenCalled();
  });

  test('tu publicación abre su hilo y su menú es el tuyo', async () => {
    mockList({ posts: [myPost] });
    const user = userEvent.setup();
    await render(<PerfilScreen />);

    await user.press(screen.getByText(myPost.title));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/hilo/[id]', params: { id: '7' } });

    await user.press(screen.getByRole('button', { name: 'Opciones de tu publicación' }));
    expect(openPostMenu).toHaveBeenCalledWith(myPost, { isMine: true });
  });

  test('tu publicación oculta se ve apagada y no se abre', async () => {
    const hiddenPost = { ...myPost, id: 8, title: 'Una que moderación ocultó', status: 'hidden' };
    mockList({ posts: [hiddenPost] });
    const user = userEvent.setup();
    await render(<PerfilScreen />);

    expect(screen.getByText('Oculta por moderación')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Opciones de tu publicación' })).toBeNull();
    jest.mocked(router.push).mockClear();
    await user.press(screen.getByText('Una que moderación ocultó'));
    expect(router.push).not.toHaveBeenCalled();
  });

  test('las filas de ajustes abren Reglas y Privacidad', async () => {
    mockList({ posts: [] });
    const user = userEvent.setup();
    await render(<PerfilScreen />);

    await user.press(screen.getByRole('button', { name: 'Reglas de la comunidad' }));
    expect(router.push).toHaveBeenCalledWith('/reglas');
    await user.press(screen.getByRole('button', { name: 'Privacidad' }));
    expect(router.push).toHaveBeenCalledWith('/privacidad');
  });
});
