import { identityColors } from '@/theme/tokens';

import { getAliasInitials, getSealColor } from '../sealColor';

const profileId = '3f1c2a9e-8b7d-4c6e-9a1f-2b3c4d5e6f70';

describe('getSealColor', () => {
  test('usa el color que eligió la persona', () => {
    expect(getSealColor({ id: profileId, color: '#123abc' })).toBe('#123abc');
  });

  test('sin color elegido usa uno de los predefinidos', () => {
    const color = getSealColor({ id: profileId, color: null });

    expect(Object.values(identityColors)).toContain(color);
  });

  test('el mismo id siempre da el mismo color', () => {
    expect(getSealColor({ id: profileId, color: null })).toBe(getSealColor({ id: profileId, color: null }));
  });
});

describe('getAliasInitials', () => {
  test('toma la primera letra de cada palabra', () => {
    expect(getAliasInitials('farol-veloz')).toBe('fv');
  });
});
