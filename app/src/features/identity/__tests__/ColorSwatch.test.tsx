import { render, screen, userEvent } from '@testing-library/react-native';

import { ColorSwatch } from '../ColorSwatch';

describe('ColorSwatch', () => {
  test('es un radio con su nombre y su estado', async () => {
    await render(<ColorSwatch color="#8aaad2" label="Azul" isSelected onSelect={jest.fn()} />);

    expect(screen.getByRole('radio', { name: 'Azul', checked: true })).toBeOnTheScreen();
  });

  test('al tocarlo avisa', async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    await render(<ColorSwatch color={null} label="Propio" isSelected={false} onSelect={onSelect} />);

    await user.press(screen.getByRole('radio', { name: 'Propio', checked: false }));
    expect(onSelect).toHaveBeenCalled();
  });
});
