import { Text as NativeText, StyleSheet, type TextProps as NativeTextProps } from 'react-native';

import { fontFamily, fontSize, type ThemeColors } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type TextVariant = 'display' | 'titleXl' | 'title' | 'bodyLarge' | 'body' | 'ui' | 'small' | 'micro';
export type TextWeight = keyof typeof fontFamily;
export type TextColor = Extract<keyof ThemeColors, 'ink' | 'ink2' | 'ink3' | 'accent' | 'onAccent' | 'paper'>;

type TextProps = NativeTextProps & {
  variant?: TextVariant;
  weight?: TextWeight;
  color?: TextColor;
};

export function Text({ variant = 'body', weight = 'regular', color = 'ink', style, ...props }: TextProps) {
  const theme = useTheme();

  return (
    <NativeText
      style={[styles[variant], { fontFamily: fontFamily[weight], color: theme[color] }, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  display: { fontSize: fontSize.display, lineHeight: Math.round(fontSize.display * 1.05) },
  titleXl: { fontSize: fontSize.titleXl, lineHeight: Math.round(fontSize.titleXl * 1.1) },
  title: { fontSize: fontSize.title, lineHeight: Math.round(fontSize.title * 1.25) },
  bodyLarge: { fontSize: fontSize.bodyLarge, lineHeight: Math.round(fontSize.bodyLarge * 1.4) },
  body: { fontSize: fontSize.body, lineHeight: Math.round(fontSize.body * 1.4) },
  ui: { fontSize: fontSize.ui, lineHeight: Math.round(fontSize.ui * 1.35) },
  small: { fontSize: fontSize.small, lineHeight: Math.round(fontSize.small * 1.4) },
  micro: { fontSize: fontSize.micro, lineHeight: Math.round(fontSize.micro * 1.4) },
});
