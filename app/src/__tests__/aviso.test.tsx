import { render, screen, userEvent } from '@testing-library/react-native';

import { useMarkNoticeSeen } from '@/features/moderation/useMarkNoticeSeen';
import { useModerationNotices } from '@/features/moderation/useModerationNotices';

import AvisoScreen from '@/app/aviso';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('@/features/moderation/useModerationNotices', () => ({ useModerationNotices: jest.fn() }));
jest.mock('@/features/moderation/useMarkNoticeSeen', () => ({ useMarkNoticeSeen: jest.fn() }));

type NoticesResult = ReturnType<typeof useModerationNotices>;

function mockNotices(overrides: Partial<NoticesResult>): void {
  jest.mocked(useModerationNotices).mockReturnValue({
    firstUnseenNotice: null,
    warningCount: null,
    isPending: false,
    isError: false,
    refetch: jest.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  jest.mocked(useMarkNoticeSeen).mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useMarkNoticeSeen>);
});

describe('AvisoScreen', () => {
  test('mientras carga lo dice', async () => {
    mockNotices({ isPending: true });
    await render(<AvisoScreen />);

    expect(screen.getByText('Cargando el aviso…')).toBeOnTheScreen();
  });

  test('si falla se puede reintentar', async () => {
    const refetch = jest.fn();
    mockNotices({ isError: true, refetch });
    const user = userEvent.setup();
    await render(<AvisoScreen />);

    expect(screen.getByText('No pudimos cargar el aviso.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  test('sin avisos pendientes lo dice en vez de quedar en blanco', async () => {
    mockNotices({});
    await render(<AvisoScreen />);

    expect(screen.getByText('No tienes avisos.')).toBeOnTheScreen();
  });
});
