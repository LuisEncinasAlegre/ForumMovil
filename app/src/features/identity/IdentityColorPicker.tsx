import { StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';
import { Text } from '@/ui/Text';

import { ColorSwatch } from './ColorSwatch';
import { CustomColorControl } from './CustomColorControl';
import { getColorLabel, IDENTITY_COLOR_OPTIONS } from './identityColors';
import type { ColorChoice } from './useColorChoice';

type IdentityColorPickerProps = {
  choice: ColorChoice;
};

// "Tu color": seis predefinidos y uno propio (components/identity-colors.elyx).
export function IdentityColorPicker({ choice }: IdentityColorPickerProps) {
  const { displayColor } = choice;
  if (!displayColor) {
    return null;
  }
  const label = choice.isCustomSelected ? 'Propio' : getColorLabel(displayColor);

  return (
    <View style={styles.picker}>
      <Text variant="ui" weight="semiBold">
        Tu color · {label}
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Tu color" style={styles.swatches}>
        {IDENTITY_COLOR_OPTIONS.map((option) => (
          <ColorSwatch
            key={option.hex}
            color={option.hex}
            label={option.label}
            isSelected={!choice.isCustomSelected && displayColor === option.hex}
            onSelect={() => choice.choosePreset(option.hex)}
          />
        ))}
        <ColorSwatch
          color={choice.isCustomSelected ? displayColor : null}
          label="Propio"
          isSelected={choice.isCustomSelected}
          onSelect={choice.openCustom}
        />
      </View>
      {choice.isCustomOpen ? <CustomColorControl color={displayColor} onChangeColor={choice.chooseCustom} /> : null}
      <Text variant="small" color="ink3">
        Elige un color para tu alias. Puedes cambiarlo cuando quieras.
      </Text>
      {choice.errorMessage ? (
        <Text variant="small" color="ink2" accessibilityRole="alert">
          {choice.errorMessage}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  picker: {
    gap: space.s2,
  },
  // en teléfonos angostos (320pt) los siete no caben en una fila: pasan a la siguiente
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: space.s2,
  },
});
