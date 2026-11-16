import { identityColors } from '@/theme/tokens';

import { getColorLabel, IDENTITY_COLOR_OPTIONS, isPresetColor } from '../identityColors';

describe('identityColors', () => {
  test('cada opción usa un color de los tokens', () => {
    const tokenColors = Object.values(identityColors);
    expect(IDENTITY_COLOR_OPTIONS).toHaveLength(tokenColors.length);
    for (const option of IDENTITY_COLOR_OPTIONS) {
      expect(tokenColors).toContain(option.hex);
    }
  });

  test('el nombre de un predefinido y "Propio" para los demás', () => {
    expect(getColorLabel(identityColors.anil)).toBe('Azul');
    expect(getColorLabel(identityColors.terracota.toUpperCase())).toBe('Rosa');
    expect(getColorLabel('#123456')).toBe('Propio');
  });

  test('isPresetColor', () => {
    expect(isPresetColor(identityColors.salvia)).toBe(true);
    expect(isPresetColor('#123456')).toBe(false);
  });
});
