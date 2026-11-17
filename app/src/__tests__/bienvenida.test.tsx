import { render, screen, userEvent } from '@testing-library/react-native';

import { useWelcome, type WelcomeState } from '@/features/session/useWelcome';

import WelcomeScreen from '@/app/bienvenida';

jest.mock('@/features/session/useWelcome', () => ({
  useWelcome: jest.fn(),
}));

const mockedUseWelcome = jest.mocked(useWelcome);

const profile = {
  id: 'usuario-1',
  display_name: 'farol-veloz',
  color: null,
  rules_accepted_at: null,
};

function mockWelcome(state: Partial<WelcomeState>): WelcomeState {
  const welcome: WelcomeState = {
    profile: null,
    aliasError: null,
    retryAlias: jest.fn(),
    enterForum: jest.fn(),
    isEntering: false,
    enterError: null,
    ...state,
  };
  mockedUseWelcome.mockReturnValue(welcome);
  return welcome;
}

describe('WelcomeScreen', () => {
  test('mientras se crea el alias muestra el fantasma y no deja entrar', async () => {
    mockWelcome({});
    await render(<WelcomeScreen />);

    expect(screen.getByLabelText('Creando tu alias')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Entrar al foro' })).toBeDisabled();
  });

  test('con el alias listo lo muestra y entrar acepta las reglas', async () => {
    const welcome = mockWelcome({ profile });
    const user = userEvent.setup();
    await render(<WelcomeScreen />);

    expect(screen.getByText('farol-veloz')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Entrar al foro' }));

    expect(welcome.enterForum).toHaveBeenCalled();
  });

  test('si falla el alias muestra el error y deja reintentar', async () => {
    const welcome = mockWelcome({ aliasError: new Error('sin conexión') });
    const user = userEvent.setup();
    await render(<WelcomeScreen />);

    expect(screen.getByText('No pudimos crear tu alias. Revisa tu conexión.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(welcome.retryAlias).toHaveBeenCalled();
  });

  test('si falla al entrar lo dice', async () => {
    mockWelcome({ profile, enterError: new Error('sin conexión') });
    await render(<WelcomeScreen />);

    expect(screen.getByText('No pudimos guardar tu entrada. Intenta de nuevo.')).toBeOnTheScreen();
  });
});
