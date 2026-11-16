import { StyleSheet, View } from 'react-native';

import { COMMUNITY_RULES } from '@/features/rules/communityRules';
import { AliasCard } from '@/features/session/AliasCard';
import { useWelcome } from '@/features/session/useWelcome';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Rule } from '@/ui/Rule';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function WelcomeScreen() {
  const welcome = useWelcome();

  const footer = (
    <>
      {welcome.enterError ? (
        <Text variant="small" color="ink2" style={styles.centered}>
          No pudimos guardar tu entrada. Intenta de nuevo.
        </Text>
      ) : null}
      <Button
        label="Entrar al foro"
        onPress={welcome.enterForum}
        disabled={!welcome.profile}
        isLoading={welcome.isEntering}
      />
      <Text variant="small" color="ink3" style={styles.centered}>
        Al entrar aceptas las reglas de la comunidad.
      </Text>
    </>
  );

  return (
    <Screen footer={footer}>
      <View style={styles.intro}>
        <Text variant="title" weight="semiBold" color="accent">
          OpenPriv
        </Text>
        <Text variant="display" weight="medium" accessibilityRole="header">
          {'Aquí hablas\nsin tu nombre.'}
        </Text>
        <Text variant="bodyLarge" color="ink2">
          Un foro para lo que no dices en persona. Sin correo, sin contraseña, sin perfil.
        </Text>
      </View>

      <View style={styles.section}>
        <AliasCard profile={welcome.profile} error={welcome.aliasError} onRetry={welcome.retryAlias} />
      </View>

      <View style={styles.section}>
        {COMMUNITY_RULES.map((rule, index) => (
          <View key={rule.title}>
            <Rule />
            <View style={styles.rule}>
              <Text variant="small" color="ink3">
                {String(index + 1).padStart(2, '0')}
              </Text>
              <Text variant="ui" style={styles.ruleText}>
                {rule.title}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    paddingTop: space.s10,
    paddingHorizontal: space.gutter,
    paddingBottom: space.s6,
    gap: space.s3,
  },
  section: {
    paddingHorizontal: space.gutter,
    paddingBottom: space.s6,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.s3,
    paddingVertical: space.s3,
  },
  ruleText: {
    flex: 1,
  },
  centered: {
    textAlign: 'center',
  },
});
