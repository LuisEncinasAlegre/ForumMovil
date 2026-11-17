import { render, screen, userEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { ActionSheet } from '../ActionSheet';
import type { ActionSheetState } from '../useActionSheet';

function makeSheet(onReport: () => void): ActionSheetState {
  return {
    isOpen: true,
    content: {
      title: '¿Eliminar esta publicación?',
      message: 'No se puede deshacer.',
      actions: [
        { label: 'Reportar', onPress: onReport },
        { label: 'Eliminar', isDestructive: true, onPress: jest.fn() },
      ],
    },
  };
}

describe('ActionSheet', () => {
  test('muestra título, mensaje, opciones y Cancelar', async () => {
    await render(<ActionSheet sheet={makeSheet(jest.fn())} onClose={jest.fn()} />);

    expect(screen.getByRole('header', { name: '¿Eliminar esta publicación?' })).toBeOnTheScreen();
    expect(screen.getByText('No se puede deshacer.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reportar' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeOnTheScreen();
  });

  test('sin título ni mensaje solo están las opciones', async () => {
    const sheet: ActionSheetState = { isOpen: true, content: { actions: [{ label: 'Reportar', onPress: jest.fn() }] } };
    await render(<ActionSheet sheet={sheet} onClose={jest.fn()} />);

    expect(screen.queryByRole('header')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reportar' })).toBeOnTheScreen();
  });

  test('cerrada no muestra nada', async () => {
    await render(<ActionSheet sheet={{ ...makeSheet(jest.fn()), isOpen: false }} onClose={jest.fn()} />);

    expect(screen.queryByRole('button', { name: 'Reportar' })).toBeNull();
  });

  test('Cancelar y tocar el fondo cierran sin elegir nada', async () => {
    const onClose = jest.fn();
    const onReport = jest.fn();
    const user = userEvent.setup();
    await render(<ActionSheet sheet={makeSheet(onReport)} onClose={onClose} />);

    await user.press(screen.getByRole('button', { name: 'Cancelar' }));
    // el fondo queda fuera del lector de pantalla (el panel es modal); ahí está Cancelar
    await user.press(screen.getByRole('button', { name: 'Cerrar', includeHiddenElements: true }));

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onReport).not.toHaveBeenCalled();
  });

  test('en Android la opción corre al tocarla', async () => {
    const platform = jest.replaceProperty(Platform, 'OS', 'android');
    const onClose = jest.fn();
    const onReport = jest.fn();
    const user = userEvent.setup();
    await render(<ActionSheet sheet={makeSheet(onReport)} onClose={onClose} />);

    await user.press(screen.getByRole('button', { name: 'Reportar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onReport).toHaveBeenCalledTimes(1);
    platform.restore();
  });

  test('en iOS la opción espera a que la hoja termine de cerrarse', async () => {
    const onClose = jest.fn();
    const onReport = jest.fn();
    const user = userEvent.setup();
    await render(<ActionSheet sheet={makeSheet(onReport)} onClose={onClose} />);

    await user.press(screen.getByRole('button', { name: 'Reportar' }));

    // la corre onDismiss del Modal, que el mock de Jest no avisa
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onReport).not.toHaveBeenCalled();
  });
});
