import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ReasonOption } from '@/features/reports/ReasonOption';
import { ReportSent } from '@/features/reports/ReportSent';
import { parseReportTarget } from '@/features/reports/parseReportTarget';
import { REPORT_REASONS } from '@/features/reports/reasons';
import { getReportTitle } from '@/features/reports/reportTitle';
import type { ReportTarget } from '@/features/reports/types';
import { useReportForm } from '@/features/reports/useReportForm';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Button } from '@/ui/Button';
import { Message } from '@/ui/Message';
import { Text } from '@/ui/Text';

// Hoja para reportar una publicación o una respuesta (screens/reportar.elyx).
// La hoja mide lo que su contenido (fitToContents), por eso aquí no se usa flex: 1.
export default function ReportScreen() {
  const params = useLocalSearchParams<{ postId?: string; commentId?: string }>();
  const target = parseReportTarget(params);
  const theme = useTheme();

  return (
    <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
      {target ? (
        <ReportSheetBody target={target} />
      ) : (
        <Message title="No encontramos qué reportar." body="Cierra esta hoja y vuelve a intentarlo desde el foro." />
      )}
    </View>
  );
}

type ReportSheetBodyProps = {
  target: ReportTarget;
};

function ReportSheetBody({ target }: ReportSheetBodyProps) {
  const form = useReportForm(target);

  if (form.result) {
    return <ReportSent result={form.result} onClose={() => router.back()} />;
  }

  return (
    <>
      {/* en Android las hojas no muestran cabecera, así que el título va en el contenido */}
      <Text variant="title" weight="medium" accessibilityRole="header">
        {getReportTitle(target)}
      </Text>
      <Text variant="ui" color="ink2" style={styles.note}>
        Tu reporte también es anónimo. Lo revisa moderación.
      </Text>
      <View accessibilityRole="radiogroup">
        {REPORT_REASONS.map((reason) => (
          <ReasonOption
            key={reason.value}
            label={reason.label}
            isSelected={form.selectedReason === reason.value}
            onSelect={() => form.selectReason(reason.value)}
          />
        ))}
      </View>
      {form.errorMessage ? (
        <Text variant="small" color="ink2" style={styles.error} accessibilityRole="alert">
          {form.errorMessage}
        </Text>
      ) : null}
      <View style={styles.submit}>
        <Button label="Enviar reporte" onPress={form.send} disabled={!form.canSend} isLoading={form.isSending} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingTop: space.s6,
    paddingHorizontal: space.gutter,
    paddingBottom: space.s8,
  },
  note: {
    paddingTop: space.s2,
    paddingBottom: space.s3,
  },
  error: {
    paddingTop: space.s3,
  },
  submit: {
    paddingTop: space.s5,
  },
});
