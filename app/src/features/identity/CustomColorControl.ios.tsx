import { ColorPicker, Host } from '@expo/ui/swift-ui';
import { StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type CustomColorControlProps = {
  color: string;
  onChangeColor: (hex: string) => void;
};

// iOS: el selector de color del sistema (cuadrícula, espectro, gotero), como fila de ajustes.
// El color se aclara después si hace falta (makeSealReadable), aquí no se limita.
export function CustomColorControl({ color, onChangeColor }: CustomColorControlProps) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { borderColor: theme.line }]}>
      <Host matchContents={{ vertical: true }} colorScheme="dark" style={styles.host}>
        <ColorPicker
          label="Elegir color"
          selection={color}
          supportsOpacity={false}
          onSelectionChange={onChangeColor}
        />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: space.s2,
    paddingVertical: space.s2,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  host: {
    width: '100%',
  },
});
