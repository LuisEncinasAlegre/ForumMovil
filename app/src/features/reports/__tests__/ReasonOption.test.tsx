import { render, screen, userEvent } from '@testing-library/react-native';

import { ReasonOption } from '../ReasonOption';

describe('ReasonOption', () => {
  test('es un radio que dice si está elegido', async () => {
    await render(<ReasonOption label="Spam o publicidad" isSelected onSelect={jest.fn()} />);

    expect(screen.getByRole('radio', { name: 'Spam o publicidad' })).toBeChecked();
  });

  test('sin elegir, tocarlo lo elige', async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    await render(<ReasonOption label="Otro motivo" isSelected={false} onSelect={onSelect} />);

    const radio = screen.getByRole('radio', { name: 'Otro motivo' });
    expect(radio).not.toBeChecked();
    await user.press(radio);
    expect(onSelect).toHaveBeenCalled();
  });
});
