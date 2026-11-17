import { StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';
import { Rule } from '@/ui/Rule';
import { Text } from '@/ui/Text';

type PostVersionProps = {
  label: string;
  // las versiones de una respuesta no tienen título
  title?: string;
  content: string;
};

// Una versión en la hoja de Versiones (screens/ediciones.elyx): cuándo, título (si tiene) y texto completo.
export function PostVersion({ label, title, content }: PostVersionProps) {
  return (
    <View style={styles.version}>
      <Text variant="small" weight="medium" color="ink3">
        {label}
      </Text>
      {title ? (
        <Text variant="bodyLarge" weight="semiBold">
          {title}
        </Text>
      ) : null}
      <Text variant="ui" color="ink2">
        {content}
      </Text>
      <View style={styles.foot}>
        <Rule />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  version: {
    paddingTop: space.s4,
    paddingHorizontal: space.gutter,
    gap: space.s2,
  },
  foot: {
    paddingTop: space.s4,
  },
});
