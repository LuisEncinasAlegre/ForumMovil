import { StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { Rule } from '@/ui/Rule';
import { Text } from '@/ui/Text';

import { banEndLabel, banTitle } from './banText';
import type { ActiveBan } from './types';

type SuspendedNoticeProps = {
  ban: ActiveBan;
};

// Contenido de la pantalla de suspensión (screens/suspendida.elyx): motivo, fin y qué puedes hacer.
export function SuspendedNotice({ ban }: SuspendedNoticeProps) {
  const theme = useTheme();
  const isBanned = ban.endsAt === null;

  return (
    <View style={styles.body}>
      <Text variant="titleXl" weight="medium" accessibilityRole="header">
        {banTitle(ban)}
      </Text>
      {/* el motivo que escribió moderación: una línea a la izquierda, sin tarjeta */}
      <View style={[styles.quote, { borderColor: theme.line }]}>
        <Text variant="bodyLarge" color="ink2">
          {ban.reason}
        </Text>
      </View>
      <View>
        <Rule />
        <View style={styles.until}>
          <Text variant="small" color="ink3">
            Termina
          </Text>
          <Text variant="body" weight="medium">
            {banEndLabel(ban.endsAt)}
          </Text>
        </View>
        <Rule />
      </View>
      <Text variant="ui" color="ink2">
        {isBanned
          ? 'Puedes seguir leyendo el foro, pero no publicar, responder ni reportar. Tampoco desde una cuenta nueva en este teléfono.'
          : 'Mientras tanto puedes leer el foro, pero no publicar, responder ni reportar.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: space.s5,
  },
  quote: {
    borderLeftWidth: 2,
    paddingLeft: space.s3,
    paddingVertical: space.s1,
  },
  until: {
    paddingVertical: space.s3,
    gap: space.s1,
  },
});
