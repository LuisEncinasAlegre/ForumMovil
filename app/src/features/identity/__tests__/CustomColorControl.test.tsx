import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ColorField } from '../ColorField';
import { hueSaturationToHex, MAX_CUSTOM_SATURATION, MIN_CUSTOM_SATURATION } from '../customColor';
// jest-expo corre como iOS, así que CustomColorControl es el de iOS; el de Android es ColorField
import { CustomColorControl as IosControl } from '../CustomColorControl';

type ColorPickerMockProps = { selection: string | null; onSelectionChange?: (value: string) => void; label?: string };

// El selector nativo de @expo/ui no existe en Jest: lo cambiamos por una vista simple.
jest.mock('@expo/ui/swift-ui', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return {
    Host: ({ children }: { children: ReactNode }) => <MockView>{children}</MockView>,
    ColorPicker: ({ selection, onSelectionChange, label }: ColorPickerMockProps) => (
      <MockView testID="selector" accessibilityLabel={label} accessibilityHint={selection ?? ''} onSelectionChange={onSelectionChange} />
    ),
  };
});

// el campo mide 300 de ancho y 160 de alto
async function renderField(color: string, onChangeColor: (hex: string) => void) {
  await render(<ColorField color={color} onChangeColor={onChangeColor} />);
  const field = screen.getByTestId('campo-de-color');
  await fireEvent(field, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 160 } } });
  return field;
}

describe('ColorField (Android y web)', () => {
  test('tocar a la izquierda arriba da rojo vivo y abajo a la derecha casi gris', async () => {
    const onChangeColor = jest.fn();
    const field = await renderField('#8aaad2', onChangeColor);

    await fireEvent(field, 'responderGrant', { nativeEvent: { locationX: 0, locationY: 0 } });
    expect(onChangeColor).toHaveBeenLastCalledWith(hueSaturationToHex({ hue: 0, saturation: MAX_CUSTOM_SATURATION }));

    await fireEvent(field, 'responderMove', { nativeEvent: { locationX: 300, locationY: 160 } });
    expect(onChangeColor).toHaveBeenLastCalledWith(hueSaturationToHex({ hue: 359, saturation: MIN_CUSTOM_SATURATION }));
  });

  test('arrastrar fuera del campo se queda en el borde', async () => {
    const onChangeColor = jest.fn();
    const field = await renderField('#8aaad2', onChangeColor);

    await fireEvent(field, 'responderMove', { nativeEvent: { locationX: -40, locationY: 400 } });
    expect(onChangeColor).toHaveBeenLastCalledWith(hueSaturationToHex({ hue: 0, saturation: MIN_CUSTOM_SATURATION }));
  });

  test('con lector de pantalla se ajusta el tono de 15 en 15', async () => {
    const onChangeColor = jest.fn();
    const start = hueSaturationToHex({ hue: 100, saturation: 0.5 });
    const field = await renderField(start, onChangeColor);

    expect(field).toHaveAccessibleName('Color propio');
    const hueBefore = Number(/Tono (\d+)/.exec(field.props.accessibilityValue.text)?.[1]);
    await fireEvent(field, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });

    expect(screen.getByTestId('campo-de-color').props.accessibilityValue.text).toBe(`Tono ${hueBefore + 15} grados`);
    expect(onChangeColor).toHaveBeenCalledTimes(1);
  });
});

describe('CustomColorControl (iOS)', () => {
  test('usa el selector del sistema con tu color, sin transparencia', async () => {
    const onChangeColor = jest.fn();
    await render(<IosControl color="#8aaad2" onChangeColor={onChangeColor} />);

    const picker = screen.getByTestId('selector');
    expect(picker.props.accessibilityLabel).toBe('Elegir color');
    expect(picker.props.accessibilityHint).toBe('#8aaad2');

    await fireEvent(picker, 'selectionChange', '#123456FF');
    expect(onChangeColor).toHaveBeenCalledWith('#123456FF');
  });
});
