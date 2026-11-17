import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AliasTag } from '@/features/identity/AliasTag';
import { useMyProfile } from '@/features/session/useMyProfile';
import { fontFamily, fontSize, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { ActionSheet } from '@/ui/ActionSheet';
import { Button } from '@/ui/Button';
import { Rule } from '@/ui/Rule';
import { Text } from '@/ui/Text';
import { TopBar } from '@/ui/TopBar';

import type { PostDraft } from './types';
import { useComposePost } from './useComposePost';
import { CONTENT_MAX_LENGTH, TITLE_MAX_LENGTH } from './validation';

type ComposeFormProps = {
  postId: number | null;
  initialDraft: PostDraft;
};

// Pantalla Escribir (screens/escribir.elyx). Sirve para publicar y para editar.
// Es un componente aparte para que el borrador empiece con la publicación ya cargada.
export function ComposeForm({ postId, initialDraft }: ComposeFormProps) {
  const theme = useTheme();
  const profileQuery = useMyProfile();
  const compose = useComposePost({ postId, initialDraft });
  const inputColors = { color: theme.ink };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.paper }]} edges={['top', 'bottom']}>
      {/* Android dibuja de borde a borde y ya no se encoge con el teclado: hay que dar behavior */}
      <KeyboardAvoidingView style={styles.screen} behavior="padding">
        <TopBar
          left={
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: compose.isSaving }}
              disabled={compose.isSaving}
              hitSlop={space.s3}
              onPress={compose.cancel}>
              <Text variant="body" weight="medium" color={compose.isSaving ? 'ink3' : 'ink2'}>
                Cancelar
              </Text>
            </Pressable>
          }
          right={
            <Button
              label={compose.isEditing ? 'Guardar' : 'Publicar'}
              tone="accent"
              size="compact"
              disabled={!compose.canSubmit}
              isLoading={compose.isSaving}
              onPress={compose.submit}
            />
          }
        />
        {compose.errorMessage ? (
          <Text variant="small" weight="medium" style={styles.error} accessibilityRole="alert">
            {compose.errorMessage}
          </Text>
        ) : null}
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.asRow}>
            <Text variant="small" color="ink3">
              {compose.isEditing ? 'Editas como' : 'Publicas como'}
            </Text>
            {profileQuery.data ? <AliasTag author={profileQuery.data} /> : null}
          </View>
          <TextInput
            accessibilityLabel="Título"
            value={compose.title}
            onChangeText={compose.setTitle}
            placeholder="Título"
            placeholderTextColor={theme.ink3}
            maxLength={TITLE_MAX_LENGTH}
            multiline
            autoFocus={!compose.isEditing}
            style={[styles.titleInput, inputColors]}
          />
          <Text variant="micro" color="ink3" style={styles.counter}>
            {compose.titleLength} / {TITLE_MAX_LENGTH}
          </Text>
          <Rule />
          <TextInput
            accessibilityLabel="Texto de la publicación"
            value={compose.content}
            onChangeText={compose.setContent}
            placeholder="Escribe lo que quieras decir"
            placeholderTextColor={theme.ink3}
            maxLength={CONTENT_MAX_LENGTH}
            multiline
            textAlignVertical="top"
            style={[styles.contentInput, inputColors]}
          />
        </ScrollView>
        <View style={[styles.foot, { borderColor: theme.line }]}>
          <Text variant="small" color="ink2">
            Recuerda respetar las reglas de la comunidad.
          </Text>
          <Text variant="micro" color="ink3">
            {compose.contentLength} / {CONTENT_MAX_LENGTH}
          </Text>
        </View>
      </KeyboardAvoidingView>
      <ActionSheet sheet={compose.discardSheet} onClose={compose.closeDiscardSheet} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  error: {
    paddingHorizontal: space.gutter,
    paddingBottom: space.s2,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: space.gutter,
  },
  asRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    paddingTop: space.s4,
    paddingBottom: space.s5,
  },
  titleInput: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.title,
    lineHeight: Math.round(fontSize.title * 1.15),
    padding: 0,
  },
  counter: {
    alignSelf: 'flex-end',
    paddingTop: space.s2,
    paddingBottom: space.s3,
  },
  contentInput: {
    flexGrow: 1,
    minHeight: 160,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyLarge,
    lineHeight: Math.round(fontSize.bodyLarge * 1.42),
    paddingHorizontal: 0,
    paddingVertical: space.s4,
  },
  foot: {
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: space.s3,
    paddingHorizontal: space.gutter,
    paddingBottom: space.s2,
  },
});
