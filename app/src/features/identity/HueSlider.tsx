import { Host, Slider } from '@expo/ui';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';
import { Text } from '@/ui/Text';

import { hexToHue, hueToHex } from './customColor';

type HueSliderProps = {
  color: string;
  onChangeColor: (hex: string) => void;
};

// Deslizador de tono para el color propio. Se usa donde no hay selector nativo (Android, web).
// La luz va fija para que cualquier tono deje leer las iniciales del sello.
export function HueSlider({ color, onChangeColor }: HueSliderProps) {
  const [hue, setHue] = useState(() => hexToHue(color));

  function changeHue(value: number): void {
    setHue(value);
    onChangeColor(hueToHex(value));
  }

  return (
    <View style={styles.control}>
      <Text variant="small" color="ink2">
        Tono
      </Text>
      <Host matchContents={{ vertical: true }} style={styles.slider}>
        <Slider value={hue} onValueChange={changeHue} min={0} max={359} step={1} testID="tono" />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  control: {
    paddingTop: space.s2,
    gap: space.s2,
  },
  slider: {
    width: '100%',
  },
});
