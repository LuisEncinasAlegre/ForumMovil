import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { COMMUNITY_RULES } from '@/features/rules/communityRules';
import { PRIVACY_NOTES } from '@/features/rules/privacyNotes';

import PrivacidadScreen from '@/app/privacidad';
import ReglasScreen from '@/app/reglas';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

describe('ReglasScreen', () => {
  test('muestra cada regla con su explicación', async () => {
    await render(<ReglasScreen />);

    expect(screen.getByRole('header', { name: 'Reglas' })).toBeOnTheScreen();
    for (const rule of COMMUNITY_RULES) {
      expect(screen.getByText(rule.title)).toBeOnTheScreen();
      expect(screen.getByText(rule.detail)).toBeOnTheScreen();
    }
  });

  test('la flecha regresa', async () => {
    const user = userEvent.setup();
    await render(<ReglasScreen />);

    await user.press(screen.getByRole('button', { name: 'Volver' }));
    expect(router.back).toHaveBeenCalled();
  });
});

describe('PrivacidadScreen', () => {
  test('muestra cada punto', async () => {
    await render(<PrivacidadScreen />);

    expect(screen.getByRole('header', { name: 'Privacidad' })).toBeOnTheScreen();
    for (const note of PRIVACY_NOTES) {
      expect(screen.getByText(note.title)).toBeOnTheScreen();
      expect(screen.getByText(note.body)).toBeOnTheScreen();
    }
  });
});
