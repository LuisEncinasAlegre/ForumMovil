import type { Profile } from '@/features/session/types';
import { identityColors } from '@/theme/tokens';

const presetColors = Object.values(identityColors);

// El color que eligió en Tú; si todavía no elige, uno de los predefinidos sacado de su id,
// así la misma persona siempre sale con el mismo color.
export function getSealColor(profile: Pick<Profile, 'id' | 'color'>): string {
  if (profile.color) {
    return profile.color;
  }
  let sum = 0;
  for (const character of profile.id) {
    sum += character.charCodeAt(0);
  }
  return presetColors[sum % presetColors.length];
}

// farol-veloz → fv
export function getAliasInitials(displayName: string): string {
  return displayName
    .split('-')
    .map((word) => word.charAt(0))
    .join('');
}
