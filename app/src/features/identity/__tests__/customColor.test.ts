import { colors } from '@/theme/tokens';

import {
  getContrastRatio,
  hexToHueSaturation,
  hueSaturationToHex,
  makeSealReadable,
  MAX_CUSTOM_SATURATION,
  MIN_CUSTOM_SATURATION,
} from '../customColor';
import { IDENTITY_COLOR_OPTIONS } from '../identityColors';

const HEX_FORMAT = /^#[0-9a-f]{6}$/;

describe('getContrastRatio', () => {
  test('negro contra blanco es 21 y un color contra sí mismo es 1', () => {
    expect(getContrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
    expect(getContrastRatio('#8aaad2', '#8aaad2')).toBeCloseTo(1);
  });
});

describe('hueSaturationToHex', () => {
  test('da un hex en minúsculas como pide la base de datos', () => {
    for (const hue of [0, 120, 240, 359]) {
      expect(hueSaturationToHex({ hue, saturation: MAX_CUSTOM_SATURATION })).toMatch(HEX_FORMAT);
    }
  });

  test('en todo el campo las iniciales se leen', () => {
    for (let hue = 0; hue < 360; hue += 5) {
      for (const saturation of [MIN_CUSTOM_SATURATION, 0.45, MAX_CUSTOM_SATURATION]) {
        const color = hueSaturationToHex({ hue, saturation });
        expect(getContrastRatio(colors.paper, color)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  test('hexToHueSaturation regresa al mismo punto', () => {
    for (const point of [
      { hue: 0, saturation: 0.75 },
      { hue: 45, saturation: 0.5 },
      { hue: 200, saturation: 0.3 },
    ]) {
      const back = hexToHueSaturation(hueSaturationToHex(point));
      expect(Math.abs(back.hue - point.hue)).toBeLessThanOrEqual(2);
      expect(Math.abs(back.saturation - point.saturation)).toBeLessThanOrEqual(0.03);
    }
  });

  test('la saturación fuera del rango se recorta', () => {
    expect(hueSaturationToHex({ hue: 90, saturation: 1 })).toBe(hueSaturationToHex({ hue: 90, saturation: MAX_CUSTOM_SATURATION }));
    expect(hueSaturationToHex({ hue: 90, saturation: 0 })).toBe(hueSaturationToHex({ hue: 90, saturation: MIN_CUSTOM_SATURATION }));
  });
});

describe('makeSealReadable', () => {
  test('no toca los colores predefinidos', () => {
    for (const option of IDENTITY_COLOR_OPTIONS) {
      expect(makeSealReadable(option.hex)).toBe(option.hex);
    }
  });

  test('aclara los colores oscuros hasta que las iniciales se leen', () => {
    for (const dark of ['#000000', '#1c1d20', '#1a2a6c']) {
      const fixed = makeSealReadable(dark);
      expect(fixed).toMatch(HEX_FORMAT);
      expect(getContrastRatio(colors.paper, fixed)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('conserva el tono al aclarar', () => {
    const fixed = makeSealReadable('#1a2a6c');
    expect(Math.abs(hexToHueSaturation(fixed).hue - hexToHueSaturation('#1a2a6c').hue)).toBeLessThanOrEqual(2);
  });

  test('quita la transparencia de iOS y pasa a minúsculas', () => {
    expect(makeSealReadable('#8AAAD2FF')).toBe('#8aaad2');
  });
});
