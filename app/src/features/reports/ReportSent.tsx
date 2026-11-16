import { StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';

import type { ReportResult } from './types';

type ReportSentProps = {
  result: ReportResult;
  onClose: () => void;
};

// La hoja después de enviar (reportarEnviado en screens/reportar.elyx).
export function ReportSent({ result, onClose }: ReportSentProps) {
  return (
    <View style={styles.sent}>
      <Text variant="title" weight="medium" accessibilityRole="header">
        {result === 'alreadyReported' ? 'Ya lo habías reportado.' : 'Gracias por avisar.'}
      </Text>
      <Text variant="ui" color="ink2" style={styles.copy}>
        Lo revisará moderación. Nadie sabrá que fuiste tú.
      </Text>
      <Button label="Listo" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  sent: {
    gap: space.s2,
  },
  copy: {
    paddingBottom: space.s4,
  },
});
