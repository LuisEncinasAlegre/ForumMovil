import { render, screen } from '@testing-library/react-native';

import { SuspendedNotice } from '../SuspendedNotice';

describe('SuspendedNotice', () => {
  test('una suspensión muestra el motivo y cuándo termina', async () => {
    const endsAt = new Date(2026, 10, 20, 14, 30).toISOString();
    await render(<SuspendedNotice ban={{ reason: 'Insultaste a otras personas.', endsAt }} />);

    expect(screen.getByText('Tu cuenta está suspendida')).toBeOnTheScreen();
    expect(screen.getByText('Insultaste a otras personas.')).toBeOnTheScreen();
    expect(screen.getByText(/20 de noviembre/)).toBeOnTheScreen();
    expect(screen.getByText(/no publicar, responder ni reportar/)).toBeOnTheScreen();
  });

  test('un baneo no tiene fecha de fin y avisa que alcanza al teléfono', async () => {
    await render(<SuspendedNotice ban={{ reason: 'Spam repetido.', endsAt: null }} />);

    expect(screen.getByText('Tu cuenta está baneada')).toBeOnTheScreen();
    expect(screen.getByText('Sin fecha de fin')).toBeOnTheScreen();
    expect(screen.getByText(/una cuenta nueva en este teléfono/)).toBeOnTheScreen();
  });
});
