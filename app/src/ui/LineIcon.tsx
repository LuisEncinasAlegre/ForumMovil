import Svg, { Path } from 'react-native-svg';

import type { ThemeColors } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type LineIconName = 'back' | 'send' | 'check' | 'chevron' | 'person';

type LineIconProps = {
  name: LineIconName;
  color?: keyof ThemeColors;
  size?: number;
};

// Los mismos trazos que Design/icons/*.svg (24×24, línea de 1.75).
const ICON_PATHS: Record<LineIconName, string[]> = {
  back: ['M19 12H5', 'M11 6l-6 6 6 6'],
  send: ['M12 19V5', 'M6 11l6-6 6 6'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  chevron: ['M9 6l6 6-6 6'],
  person: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5'],
};

// Íconos de línea del diseño. Son decorativos: el botón que los lleva tiene su propia etiqueta.
export function LineIcon({ name, color = 'ink', size = 24 }: LineIconProps) {
  const theme = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {ICON_PATHS[name].map((path) => (
        <Path
          key={path}
          d={path}
          stroke={theme[color]}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
