import { colors, type ThemeColors } from './tokens';

// Solo hay tema oscuro por ahora. Cuando exista la paleta clara, aquí se elige
// con useColorScheme() y los componentes no cambian.
export function useTheme(): ThemeColors {
  return colors;
}
