import { StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';

import { categoryLabel, noticeTitle, warningLine } from './noticeText';
import type { ModerationNotice } from './types';

type NoticeBodyProps = {
  notice: ModerationNotice;
  warningCount: number | null;
  isSaving: boolean;
  errorMessage: string | null;
  onAcknowledge: () => void;
};

// Contenido de la hoja de aviso (screens/aviso.elyx): qué se ocultó, por qué y cuántas llevas.
export function NoticeBody({ notice, warningCount, isSaving, errorMessage, onAcknowledge }: NoticeBodyProps) {
  const theme = useTheme();
  const countLine = warningLine(notice, warningCount);

  return (
    <View style={styles.body}>
      <Text variant="title" weight="medium" accessibilityRole="header">
        {noticeTitle(notice)}
      </Text>
      {/* cita de lo ocultado: una línea a la izquierda, sin tarjeta */}
      <View style={[styles.quote, { borderColor: theme.line }]}>
        <Text variant="bodyLarge" color="ink2">
          {notice.excerpt}
        </Text>
      </View>
      <Text variant="ui" weight="semiBold">
        {'Motivo: ' + categoryLabel(notice.category)}
      </Text>
      <Text variant="ui" color="ink2">
        {notice.message}
      </Text>
      {countLine ? (
        <Text variant="small" color="ink3">
          {countLine}
        </Text>
      ) : null}
      {errorMessage ? (
        <Text variant="small" color="ink2" accessibilityRole="alert">
          {errorMessage}
        </Text>
      ) : null}
      <View style={styles.action}>
        <Button label="Entendido" onPress={onAcknowledge} isLoading={isSaving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: space.s3,
  },
  quote: {
    borderLeftWidth: 2,
    paddingLeft: space.s3,
    paddingVertical: space.s1,
  },
  action: {
    paddingTop: space.s2,
  },
});
