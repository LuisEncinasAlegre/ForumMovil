import { identityColors } from '@/theme/tokens';

export type IdentityColorOption = {
  hex: string;
  label: string;
};

// Los colores predefinidos en el orden del diseño (components/identity-colors.elyx).
export const IDENTITY_COLOR_OPTIONS: IdentityColorOption[] = [
  { hex: identityColors.terracota, label: 'Rosa' },
  { hex: identityColors.anil, label: 'Azul' },
  { hex: identityColors.salvia, label: 'Salvia' },
  { hex: identityColors.ocre, label: 'Ámbar' },
  { hex: identityColors.ciruela, label: 'Violeta' },
  { hex: identityColors.piedra, label: 'Gris' },
];

export function isPresetColor(hex: string): boolean {
  return IDENTITY_COLOR_OPTIONS.some((option) => option.hex === hex.toLowerCase());
}

// "Azul" para un predefinido, "Propio" para cualquier otro.
export function getColorLabel(hex: string): string {
  const option = IDENTITY_COLOR_OPTIONS.find((item) => item.hex === hex.toLowerCase());
  return option ? option.label : 'Propio';
}
