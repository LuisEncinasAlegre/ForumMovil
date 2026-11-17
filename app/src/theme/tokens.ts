// Tokens de diseño copiados del proyecto de Elyx (tokens/colors-dark.elyx, lengths.elyx, type.elyx).
// Si falta un valor, se agrega primero en Elyx y luego aquí.

export type ThemeColors = {
  canvas: string;
  paper: string;
  surface: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  scrim: string;
};

// Por ahora la app solo tiene tema oscuro (app.json: userInterfaceStyle "dark").
export const colors: ThemeColors = {
  canvas: '#303136',
  paper: '#1c1d20',
  surface: '#27282c',
  ink: '#f0f0f2',
  ink2: '#c2c3c9',
  ink3: '#9799a2',
  line: '#383a40',
  accent: '#c6323e',
  onAccent: '#ffffff',
  accentSoft: '#3c272c',
  scrim: '#0000008c',
};

// Colores de identidad que cada quien puede elegir para su sello.
// Mismo orden que en el diseño; los guardamos en minúsculas como en profiles.color.
export const identityColors = {
  ocre: '#c6aa6b',
  salvia: '#89b39b',
  anil: '#8aaad2',
  ciruela: '#b09cc8',
  terracota: '#cf7d86',
  piedra: '#a7a9b1',
};

export const space = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s8: 32,
  s10: 40,
  s12: 48,
  gutter: 20,
};

export const radius = {
  xs: 2,
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export const fontSize = {
  display: 40,
  titleXl: 30,
  title: 22,
  bodyLarge: 18,
  body: 16,
  ui: 15,
  small: 13,
  micro: 11,
};

// Nombres con los que @expo-google-fonts registra cada peso de IBM Plex Sans.
export const fontFamily = {
  regular: 'IBMPlexSans_400Regular',
  medium: 'IBMPlexSans_500Medium',
  semiBold: 'IBMPlexSans_600SemiBold',
  bold: 'IBMPlexSans_700Bold',
};
