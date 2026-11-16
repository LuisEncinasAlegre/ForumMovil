import { colors } from '@/theme/tokens';

import { getContrastRatio, hexToHue, hueToHex, makeSealReadable } from '../customColor';
import { IDENTITY_COLOR_OPTIONS } from '../identityColors';

const HEX_FORMAT = /^#[0-9a-f]{6}$/;

describe('getContrastRatio', () => {
  test('negro contra blanco es 21 y un color contra sí mismo es 1', () => {
    expect(getContrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
    expect(getContrastRatio('#8aaad2', '#8aaad2')).toBeCloseTo(1);
  });
});

describe('hueToHex', () => {
  test('da un hex en minúsculas como pide la base de datos', () => {
    for (const hue of [0, 120, 240, 359]) {
      expect(hueToHex(hue)).toMatch(HEX_FORMAT);
    }
  });

  test('cualquier tono deja leer las iniciales sin tener que aclararlo', () => {
    for (let hue = 0; hue < 360; hue += 1) {
      const color = hueToHex(hue);
      expect(getContrastRatio(colors.paper, color)).toBeGreaterThanOrEqual(4.5);
      expect(makeSealReadable(color)).toBe(color);
    }
  });

  test('hexToHue regresa al mismo tono', () => {
    for (const hue of [0, 45, 200, 300]) {
      expect(Math.abs(hexToHue(hueToHex(hue)) - hue)).toBeLessThanOrEqual(1);
    }
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
    expect(Math.abs(hexToHue(fixed) - hexToHue('#1a2a6c'))).toBeLessThanOrEqual(2);
  });

  test('quita la transparencia de iOS y pasa a minúsculas', () => {
    expect(makeSealReadable('#8AAAD2FF')).toBe('#8aaad2');
  });
});
