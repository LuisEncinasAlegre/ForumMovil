import { colors } from '@/theme/tokens';

// Las iniciales del sello van en el color del fondo (paper), así que el sello tiene que ser claro.
// 4.5 es el contraste mínimo de WCAG para texto normal.
const MIN_INITIALS_CONTRAST = 4.5;

// Selector de color de Android: la luz va fija (parecida a los predefinidos) y la saturación va de
// casi gris a viva. Así ningún color queda tan oscuro que no se lean las iniciales.
export const MIN_CUSTOM_SATURATION = 0.15;
export const MAX_CUSTOM_SATURATION = 0.75;
const CUSTOM_LIGHTNESS = 0.68;

type Rgb = { red: number; green: number; blue: number };
type Hsl = { hue: number; saturation: number; lightness: number };

function hexToRgb(hex: string): Rgb {
  // #rrggbb o #rrggbbaa (iOS); la transparencia no se usa
  const clean = hex.replace('#', '').slice(0, 6);
  return {
    red: parseInt(clean.slice(0, 2), 16),
    green: parseInt(clean.slice(2, 4), 16),
    blue: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex({ red, green, blue }: Rgb): string {
  const parts = [red, green, blue].map((value) => Math.round(value).toString(16).padStart(2, '0'));
  // en minúsculas porque así lo exige el check de profiles.color
  return '#' + parts.join('');
}

function hslToRgb({ hue, saturation, lightness }: Hsl): Rgb {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const section = hue / 60;
  const second = chroma * (1 - Math.abs((section % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;
  if (section < 1) {
    red = chroma;
    green = second;
  } else if (section < 2) {
    red = second;
    green = chroma;
  } else if (section < 3) {
    green = chroma;
    blue = second;
  } else if (section < 4) {
    green = second;
    blue = chroma;
  } else if (section < 5) {
    red = second;
    blue = chroma;
  } else {
    red = chroma;
    blue = second;
  }
  const match = lightness - chroma / 2;
  return { red: (red + match) * 255, green: (green + match) * 255, blue: (blue + match) * 255 };
}

function rgbToHsl({ red, green, blue }: Rgb): Hsl {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) {
    return { hue: 0, saturation: 0, lightness };
  }
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (max === r) {
    hue = 60 * (((g - b) / delta) % 6);
  } else if (max === g) {
    hue = 60 * ((b - r) / delta + 2);
  } else {
    hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) {
    hue += 360;
  }
  return { hue, saturation, lightness };
}

function getLuminance(hex: string): number {
  const { red, green, blue } = hexToRgb(hex);
  const [r, g, b] = [red, green, blue].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Contraste de WCAG entre dos colores: de 1 (iguales) a 21 (negro y blanco).
export function getContrastRatio(foreground: string, background: string): number {
  const first = getLuminance(foreground);
  const second = getLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export type HueSaturation = { hue: number; saturation: number };

// Punto del selector de Android (tono 0–359, saturación) → color del sello, ya legible.
export function hueSaturationToHex({ hue, saturation }: HueSaturation): string {
  const clamped = Math.min(MAX_CUSTOM_SATURATION, Math.max(MIN_CUSTOM_SATURATION, saturation));
  return makeSealReadable(rgbToHex(hslToRgb({ hue: hue % 360, saturation: clamped, lightness: CUSTOM_LIGHTNESS })));
}

// Color guardado → punto del selector, para que empiece donde estaba.
export function hexToHueSaturation(hex: string): HueSaturation {
  const hsl = rgbToHsl(hexToRgb(hex));
  return {
    hue: Math.round(hsl.hue) % 360,
    saturation: Math.min(MAX_CUSTOM_SATURATION, Math.max(MIN_CUSTOM_SATURATION, hsl.saturation)),
  };
}

// El gris de la parte baja del selector (saturación 0 con la misma luz).
export const CUSTOM_GRAY = rgbToHex(hslToRgb({ hue: 0, saturation: 0, lightness: CUSTOM_LIGHTNESS }));

// Si el color es tan oscuro que las iniciales no se leerían, lo aclaramos sin cambiar el tono.
export function makeSealReadable(hex: string): string {
  let color = rgbToHex(hexToRgb(hex));
  const hsl = rgbToHsl(hexToRgb(color));
  while (getContrastRatio(colors.paper, color) < MIN_INITIALS_CONTRAST && hsl.lightness < 1) {
    hsl.lightness = Math.min(1, hsl.lightness + 0.02);
    color = rgbToHex(hslToRgb(hsl));
  }
  return color;
}
