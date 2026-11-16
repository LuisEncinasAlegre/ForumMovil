import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { hueToHex } from '../customColor';
// jest-expo corre como iOS, así que CustomColorControl es el de iOS; el de Android es HueSlider
import { CustomColorControl as IosControl } from '../CustomColorControl';
import { HueSlider } from '../HueSlider';

type SliderMockProps = { value: number; onValueChange: (value: number) => void; testID?: string };
type ColorPickerMockProps = { selection: string | null; onSelectionChange?: (value: string) => void; label?: string };

// Los controles nativos de @expo/ui no existen en Jest: los cambiamos por vistas simples.
jest.mock('@expo/ui', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return {
    Host: ({ children }: { children: ReactNode }) => <MockView>{children}</MockView>,
    Slider: ({ value, onValueChange, testID }: SliderMockProps) => (
      <MockView testID={testID} accessibilityValue={{ now: value }} onValueChange={onValueChange} />
    ),
  };
});
jest.mock('@expo/ui/swift-ui', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return {
    Host: ({ children }: { children: ReactNode }) => <MockView>{children}</MockView>,
    ColorPicker: ({ selection, onSelectionChange, label }: ColorPickerMockProps) => (
      <MockView testID="selector" accessibilityLabel={label} accessibilityHint={selection ?? ''} onSelectionChange={onSelectionChange} />
    ),
  };
});

describe('HueSlider (Android)', () => {
  test('el deslizador empieza en tu tono y al moverlo manda el color', async () => {
    const onChangeColor = jest.fn();
    await render(<HueSlider color={hueToHex(200)} onChangeColor={onChangeColor} />);

    expect(screen.getByText('Tono')).toBeOnTheScreen();
    expect(screen.getByTestId('tono').props.accessibilityValue.now).toBeCloseTo(200, -1);

    fireEvent(screen.getByTestId('tono'), 'valueChange', 30);
    expect(onChangeColor).toHaveBeenCalledWith(hueToHex(30));
  });
});

describe('CustomColorControl (iOS)', () => {
  test('usa el selector del sistema con tu color, sin transparencia', async () => {
    const onChangeColor = jest.fn();
    await render(<IosControl color="#8aaad2" onChangeColor={onChangeColor} />);

    const picker = screen.getByTestId('selector');
    expect(picker.props.accessibilityLabel).toBe('Elegir color');
    expect(picker.props.accessibilityHint).toBe('#8aaad2');

    fireEvent(picker, 'selectionChange', '#123456FF');
    expect(onChangeColor).toHaveBeenCalledWith('#123456FF');
  });
});
