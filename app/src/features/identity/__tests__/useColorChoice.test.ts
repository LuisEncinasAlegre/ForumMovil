import { act, renderHook } from '@testing-library/react-native';

import type { Profile } from '@/features/session/types';
import { useUpdateMyColor } from '@/features/session/useUpdateMyColor';
import { colors, identityColors } from '@/theme/tokens';

import { getContrastRatio } from '../customColor';
import { CUSTOM_COLOR_SAVE_DELAY_MS, useColorChoice } from '../useColorChoice';

jest.mock('@/features/session/useUpdateMyColor', () => ({ useUpdateMyColor: jest.fn() }));

const profile: Profile = {
  id: 'usuario-1',
  display_name: 'farol-veloz',
  color: identityColors.anil,
  rules_accepted_at: '2026-11-15T00:00:00Z',
  created_at: '2026-11-15T00:00:00Z',
};

function mockMutation(isError = false) {
  const mutate = jest.fn();
  jest.mocked(useUpdateMyColor).mockReturnValue({
    mutate,
    isError,
    error: isError ? new Error('permission denied') : null,
  } as never);
  return mutate;
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useColorChoice', () => {
  test('un predefinido se guarda al tocarlo', async () => {
    const mutate = mockMutation();
    const { result } = await renderHook(() => useColorChoice(profile));

    await act(async () => result.current.choosePreset(identityColors.salvia));

    expect(mutate).toHaveBeenCalledWith(identityColors.salvia, expect.anything());
  });

  test('tocar el color que ya tienes no guarda nada', async () => {
    const mutate = mockMutation();
    const { result } = await renderHook(() => useColorChoice(profile));

    await act(async () => result.current.choosePreset(identityColors.anil));

    expect(mutate).not.toHaveBeenCalled();
  });

  test('el color propio se ve al momento y se guarda una vez cuando dejas de moverlo', async () => {
    const mutate = mockMutation();
    const { result } = await renderHook(() => useColorChoice(profile));

    await act(async () => {
      result.current.openCustom();
      result.current.chooseCustom('#d99b78');
      result.current.chooseCustom('#d98a5e');
    });

    expect(result.current.displayColor).toBe('#d98a5e');
    expect(result.current.isCustomSelected).toBe(true);
    expect(mutate).not.toHaveBeenCalled();

    await act(async () => jest.advanceTimersByTime(CUSTOM_COLOR_SAVE_DELAY_MS));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith('#d98a5e', expect.anything());
  });

  test('un color muy oscuro se aclara solo, sin preguntar', async () => {
    const mutate = mockMutation();
    const { result } = await renderHook(() => useColorChoice(profile));

    await act(async () => result.current.chooseCustom('#000000'));
    await act(async () => jest.advanceTimersByTime(CUSTOM_COLOR_SAVE_DELAY_MS));

    const saved = mutate.mock.calls[0][0] as string;
    expect(saved).toBe(result.current.displayColor);
    expect(getContrastRatio(colors.paper, saved)).toBeGreaterThanOrEqual(4.5);
  });

  test('si sales antes de que pase la espera, se guarda igual', async () => {
    const mutate = mockMutation();
    const { result, unmount } = await renderHook(() => useColorChoice(profile));

    await act(async () => result.current.chooseCustom('#d98a5e'));
    await act(async () => unmount());

    expect(mutate).toHaveBeenCalledWith('#d98a5e');
  });

  test('si falla muestra el mensaje', async () => {
    mockMutation(true);
    const { result } = await renderHook(() => useColorChoice(profile));

    expect(result.current.errorMessage).toBe('No pudimos guardar tu color. Inténtalo otra vez.');
  });
});
