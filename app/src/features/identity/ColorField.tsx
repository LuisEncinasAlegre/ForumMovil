import { useState } from 'react';
import {
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import {
  CUSTOM_GRAY,
  hexToHueSaturation,
  hueSaturationToHex,
  MAX_CUSTOM_SATURATION,
  MIN_CUSTOM_SATURATION,
  type HueSaturation,
} from './customColor';

type ColorFieldProps = {
  color: string;
  onChangeColor: (hex: string) => void;
};

const FIELD_HEIGHT = 160;
const THUMB_SIZE = space.s6;
// con lector de pantalla, cada paso mueve el tono 15°
const HUE_STEP = 15;
// paradas del arcoíris de izquierda a derecha, con la saturación más viva
const HUE_STOPS = [0, 60, 120, 180, 240, 300, 359];

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// Selector de color de Android y web: tocas o arrastras sobre el campo. De izquierda a derecha
// cambia el tono; de arriba (vivo) a abajo (gris), la saturación. En iOS se usa el del sistema.
export function ColorField({ color, onChangeColor }: ColorFieldProps) {
  const theme = useTheme();
  const [point, setPoint] = useState<HueSaturation>(() => hexToHueSaturation(color));
  const [width, setWidth] = useState(0);

  function choose(next: HueSaturation): void {
    setPoint(next);
    onChangeColor(hueSaturationToHex(next));
  }

  function chooseAt(event: GestureResponderEvent): void {
    if (width === 0) {
      return;
    }
    const { locationX, locationY } = event.nativeEvent;
    const saturationRange = MAX_CUSTOM_SATURATION - MIN_CUSTOM_SATURATION;
    choose({
      hue: Math.round(clamp(locationX / width) * 359),
      saturation: MAX_CUSTOM_SATURATION - clamp(locationY / FIELD_HEIGHT) * saturationRange,
    });
  }

  function measure(event: LayoutChangeEvent): void {
    setWidth(event.nativeEvent.layout.width);
  }

  function runAccessibilityAction(event: AccessibilityActionEvent): void {
    const step = event.nativeEvent.actionName === 'increment' ? HUE_STEP : -HUE_STEP;
    choose({ ...point, hue: (point.hue + step + 360) % 360 });
  }

  const saturationRange = MAX_CUSTOM_SATURATION - MIN_CUSTOM_SATURATION;
  const thumbLeft = (point.hue / 359) * width - THUMB_SIZE / 2;
  const thumbTop = ((MAX_CUSTOM_SATURATION - point.saturation) / saturationRange) * FIELD_HEIGHT - THUMB_SIZE / 2;

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Color propio"
      accessibilityValue={{ text: `Tono ${point.hue} grados` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={runAccessibilityAction}
      onLayout={measure}
      // el campo se queda con el dedo: la lista no se desplaza mientras eliges
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={chooseAt}
      onResponderMove={chooseAt}
      testID="campo-de-color"
      style={[styles.field, { borderColor: theme.line }]}>
      <Svg width="100%" height={FIELD_HEIGHT} pointerEvents="none">
        <Defs>
          <LinearGradient id="tonos" x1="0" y1="0" x2="1" y2="0">
            {HUE_STOPS.map((hue) => (
              <Stop
                key={hue}
                offset={hue / 359}
                stopColor={hueSaturationToHex({ hue, saturation: MAX_CUSTOM_SATURATION })}
              />
            ))}
          </LinearGradient>
          <LinearGradient id="gris" x1="0" y1="0" x2="0" y2="1">
            <Stop offset={0} stopColor={CUSTOM_GRAY} stopOpacity={0} />
            <Stop offset={1} stopColor={CUSTOM_GRAY} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#tonos)" />
        <Rect width="100%" height="100%" fill="url(#gris)" />
      </Svg>
      {width > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              left: thumbLeft,
              top: thumbTop,
              borderColor: theme.ink,
              backgroundColor: hueSaturationToHex(point),
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: FIELD_HEIGHT,
    marginTop: space.s2,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2,
  },
});
