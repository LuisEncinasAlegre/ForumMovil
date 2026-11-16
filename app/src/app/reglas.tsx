import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COMMUNITY_RULES } from '@/features/rules/communityRules';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { BackButton } from '@/ui/BackButton';
import { Rule } from '@/ui/Rule';
import { Text } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';

// Reglas de la comunidad con su explicación (screens/reglas.elyx).
export default function ReglasScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.paper }]} edges={['top', 'bottom']}>
      <TopBar left={<BackButton />} title="Reglas" />
      <ScrollView>
        <Text variant="title" weight="medium" style={styles.intro}>
          Son pocas y van en serio. Las aceptaste al entrar.
        </Text>
        {COMMUNITY_RULES.map((rule, index) => (
          <View key={rule.title}>
            <Rule />
            <View style={styles.rule}>
              <Text variant="small" color="ink3">
                {String(index + 1).padStart(2, '0')}
              </Text>
              <View style={styles.ruleCopy}>
                <Text variant="body" weight="semiBold">
                  {rule.title}
                </Text>
                <Text variant="ui" color="ink2">
                  {rule.detail}
                </Text>
              </View>
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
  intro: {
    paddingTop: space.s3,
    paddingHorizontal: space.gutter,
    paddingBottom: space.s6,
  },
  rule: {
    flexDirection: 'row',
    gap: space.s3,
    paddingVertical: space.s4,
    paddingHorizontal: space.gutter,
  },
  ruleCopy: {
    flex: 1,
    gap: space.s1,
  },
});
