import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { NoticeBody } from '@/features/moderation/NoticeBody';
import { useMarkNoticeSeen } from '@/features/moderation/useMarkNoticeSeen';
import { useModerationNotices } from '@/features/moderation/useModerationNotices';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Message } from '@/ui/Message';

// Hoja con el aviso de moderación más antiguo sin ver (screens/aviso.elyx).
// La abre el foro; "Entendido" lo marca como visto y cierra.
export default function AvisoScreen() {
  const theme = useTheme();
  const notices = useModerationNotices();
  const markSeen = useMarkNoticeSeen();
  const notice = notices.firstUnseenNotice;

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

  return (
    <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
      {notice ? (
        <NoticeBody
          notice={notice}
          warningCount={notices.warningCount}
          isSaving={markSeen.isPending}
          errorMessage={errorMessage}
          onAcknowledge={acknowledge}
        />
      ) : (
        <Message title="No tienes avisos." body="Cierra esta hoja para volver al foro." />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingTop: space.s6,
    paddingHorizontal: space.gutter,
    paddingBottom: space.s8,
  },
});
