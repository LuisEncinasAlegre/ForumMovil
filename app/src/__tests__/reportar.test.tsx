import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';

import { createReport } from '@/features/reports/api';

import ReportScreen from '@/app/reportar';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => {}),
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('@/features/reports/api', () => ({ createReport: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

function renderWithQueryClient(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useLocalSearchParams).mockReturnValue({ postId: '7' });
});

describe('ReportScreen', () => {
  test('no deja enviar hasta elegir un motivo, y manda el elegido', async () => {
    jest.mocked(createReport).mockResolvedValue('sent');
    const user = userEvent.setup();
    await renderWithQueryClient(<ReportScreen />);

    expect(screen.getByText('¿Qué pasa con esta publicación?')).toBeOnTheScreen();
    const send = screen.getByRole('button', { name: 'Enviar reporte' });
    expect(send).toBeDisabled();

    await user.press(screen.getByRole('radio', { name: 'Acoso o ataque a una persona' }));
    await user.press(send);

    expect(createReport).toHaveBeenCalledWith({ kind: 'post', postId: 7 }, 'acoso');
    expect(await screen.findByText('Gracias por avisar.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Listo' }));
    expect(router.back).toHaveBeenCalled();
  });

  test('para una respuesta cambia la pregunta', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ commentId: '30' });
    await renderWithQueryClient(<ReportScreen />);

    expect(screen.getByText('¿Qué pasa con esta respuesta?')).toBeOnTheScreen();
  });

  test('si ya lo habías reportado lo dice sin error', async () => {
    jest.mocked(createReport).mockResolvedValue('alreadyReported');
    const user = userEvent.setup();
    await renderWithQueryClient(<ReportScreen />);

    await user.press(screen.getByRole('radio', { name: 'Spam o publicidad' }));
    await user.press(screen.getByRole('button', { name: 'Enviar reporte' }));

    expect(await screen.findByText('Ya lo habías reportado.')).toBeOnTheScreen();
  });

  test('si falla, avisa en una línea y el motivo sigue elegido', async () => {
    jest.mocked(createReport).mockRejectedValue({ message: 'TypeError: Network request failed' });
    const user = userEvent.setup();
    await renderWithQueryClient(<ReportScreen />);

    await user.press(screen.getByRole('radio', { name: 'Otro motivo' }));
    await user.press(screen.getByRole('button', { name: 'Enviar reporte' }));

    expect(await screen.findByText('No hay conexión. Revisa tu red e inténtalo otra vez.')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Otro motivo' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Enviar reporte' })).toBeEnabled();
  });

  test('con un enlace roto no muestra el formulario', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ postId: 'abc' });
    await renderWithQueryClient(<ReportScreen />);

    expect(screen.getByText('No encontramos qué reportar.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Enviar reporte' })).toBeNull();
  });
});
