import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PRIVACY_NOTES } from '@/features/rules/privacyNotes';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { BackButton } from '@/ui/BackButton';
import { Rule } from '@/ui/Rule';
import { Text } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';

// Qué guarda la app y qué pasa con lo que escribes (screens/privacidad.elyx).
export default function PrivacidadScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.paper }]} edges={['top', 'bottom']}>
      <TopBar left={<BackButton />} title="Privacidad" />
      <ScrollView>
        {PRIVACY_NOTES.map((note) => (
          <View key={note.title}>
            <Rule />
            <View style={styles.note}>
              <Text variant="body" weight="semiBold">
                {note.title}
              </Text>
              <Text variant="ui" color="ink2">
                {note.body}
              </Text>
            </View>
          </View>
        ))}
        <Rule />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  note: {
    gap: space.s1,
    paddingVertical: space.s4,
    paddingHorizontal: space.gutter,
  },
});
