import { router } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

import { NoticeBody } from '@/features/moderation/NoticeBody';
import { useMarkNoticeSeen } from '@/features/moderation/useMarkNoticeSeen';
import { useModerationNotices } from '@/features/moderation/useModerationNotices';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Message } from '@/ui/Message';
import { Text } from '@/ui/Text';

// Hoja con el aviso de moderación más antiguo sin ver (screens/aviso.elyx).
// La abre el foro; "Entendido" lo marca como visto y cierra.
export default function AvisoScreen() {
  const theme = useTheme();
  const notices = useModerationNotices();
  const markSeen = useMarkNoticeSeen();
  const notice = notices.firstUnseenNotice;
  const { height } = useWindowDimensions();

  function acknowledge(): void {
    if (!notice) {
      return;
    }
    markSeen.mutate(notice.id, { onSuccess: () => router.back() });
  }

  let errorMessage: string | null = null;
  if (markSeen.isError) {
    errorMessage = 'No pudimos guardar que lo viste. Revisa tu red e inténtalo otra vez.';
  }

  function renderContent() {
    if (notice) {
      return (
        <NoticeBody
          notice={notice}
          warningCount={notices.warningCount}
          isSaving={markSeen.isPending}
          errorMessage={errorMessage}
          onAcknowledge={acknowledge}
        />
      );
    }
    if (notices.isPending) {
      return (
        <Text variant="ui" color="ink2" accessibilityRole="progressbar">
          Cargando el aviso…
        </Text>
      );
    }
    if (notices.isError) {
      return (
        <Message
          title="No pudimos cargar el aviso."
          body="Revisa tu conexión y vuelve a intentarlo."
          actionLabel="Reintentar"
          onAction={notices.refetch}
        />
      );
    }
    return <Message title="No tienes avisos." body="Cierra esta hoja para volver al foro." />;
  }

  // La hoja mide lo que su contenido (fitToContents). Con letra muy grande o un mensaje largo,
  // el contenido se desplaza en vez de cortar el botón "Entendido".
  return (
    <ScrollView
      style={[{ backgroundColor: theme.surface }, { maxHeight: height * SHEET_MAX_HEIGHT }]}
      contentContainerStyle={styles.sheet}>
      {renderContent()}
    </ScrollView>
  );
}

// la hoja nunca pasa del 90% de la pantalla; lo demás se desplaza
const SHEET_MAX_HEIGHT = 0.9;

const styles = StyleSheet.create({
  sheet: {
    paddingTop: space.s6,
    paddingHorizontal: space.gutter,
    paddingBottom: space.s8,
  },
});
