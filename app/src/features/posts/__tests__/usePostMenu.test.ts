import { act, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useMyBan } from '@/features/moderation/useMyBan';

import type { FeedPost } from '../types';
import { useDeletePost } from '../useDeletePost';
import { usePostMenu } from '../usePostMenu';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/features/moderation/useMyBan', () => ({ useMyBan: jest.fn() }));
jest.mock('../useDeletePost', () => ({ useDeletePost: jest.fn() }));

const post: FeedPost = {
  id: 7,
  title: 'Título',
  content: 'Texto',
  status: 'visible',
  created_at: '2026-11-15T00:00:00Z',
  edited_at: null,
  author: { id: 'usuario-1', display_name: 'farol-veloz', color: null, restriction: null },
  replyCount: 0,
};

let mutate: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mutate = jest.fn();
  jest.mocked(useDeletePost).mockReturnValue({ mutate, error: null } as unknown as ReturnType<typeof useDeletePost>);
  jest.mocked(useMyBan).mockReturnValue({ ban: null, isPending: false, isError: false, refetch: jest.fn() });
});

function labelsOf(menu: ReturnType<typeof usePostMenu>): string[] {
  return menu.sheet.content?.actions.map((action) => action.label) ?? [];
}

describe('usePostMenu', () => {
  test('en la publicación de otra persona solo se puede reportar', async () => {
    const { result } = await renderHook(() => usePostMenu());

    await act(() => result.current.openPostMenu(post, { isMine: false }));

    expect(result.current.sheet.isOpen).toBe(true);
    expect(result.current.sheet.content?.title).toBeUndefined();
    expect(labelsOf(result.current)).toEqual(['Reportar']);
    await act(() => result.current.sheet.content?.actions[0].onPress());
    expect(router.push).toHaveBeenCalledWith({ pathname: '/reportar', params: { postId: '7' } });
  });

  test('en la tuya, Eliminar pide confirmar antes de borrar', async () => {
    const onDeleted = jest.fn();
    const { result } = await renderHook(() => usePostMenu());

    await act(() => result.current.openPostMenu(post, { isMine: true, onDeleted }));
    expect(labelsOf(result.current)).toEqual(['Editar', 'Eliminar']);

    await act(() => result.current.sheet.content?.actions[1].onPress());
    expect(result.current.sheet.content?.title).toBe('¿Eliminar esta publicación?');
    expect(mutate).not.toHaveBeenCalled();

    await act(() => result.current.sheet.content?.actions[0].onPress());
    expect(mutate).toHaveBeenCalledWith(7, { onSuccess: onDeleted });
  });

  test('con la cuenta suspendida el menú explica por qué', async () => {
    jest.mocked(useMyBan).mockReturnValue({
      ban: { reason: 'Spam repetido.', endsAt: null },
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    });
    const { result } = await renderHook(() => usePostMenu());

    await act(() => result.current.openPostMenu(post, { isMine: true }));

    expect(labelsOf(result.current)).toEqual(['Ver por qué']);
  });
});
