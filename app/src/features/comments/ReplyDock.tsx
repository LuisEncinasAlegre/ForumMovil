import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { fontFamily, fontSize, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { LineIcon } from '@/ui/LineIcon';
import { Text } from '@/ui/Text';

import type { ReplyDockState } from './useReplyDock';
import { COMMENT_MAX_LENGTH } from './validation';

type ReplyDockProps = {
  dock: ReplyDockState;
  authorName: string;
  onSent: () => void;
};

// Muelle de abajo del hilo (blocks/bars.elyx, replyDock y replyDockEditing).
export function ReplyDock({ dock, authorName, onSent }: ReplyDockProps) {
  const theme = useTheme();
  const isEditing = dock.editingComment !== null;

  async function sendAndScroll(): Promise<void> {
    const wasReplying = !isEditing;
    const sending = dock.send();
    // bajamos al final de una vez, para ver la respuesta tenue mientras se envía
    if (wasReplying) {
      onSent();
    }
    await sending;
  }

  return (
    <View style={[styles.dock, { borderColor: theme.line, backgroundColor: theme.paper }]}>
      {isEditing ? (
        <View style={styles.editing}>
          <Text variant="small" weight="medium" color="ink2">
            Editando tu respuesta
          </Text>
          <Pressable accessibilityRole="button" hitSlop={space.s3} onPress={dock.cancelEditing}>
            <Text variant="small" weight="semiBold">
              Cancelar
            </Text>
          </Pressable>
        </View>
      ) : null}
      {dock.errorMessage ? (
        <Text variant="small" weight="medium" style={styles.error} accessibilityRole="alert">
          {dock.errorMessage}
        </Text>
      ) : null}
      <View style={styles.pad}>
        <TextInput
          accessibilityLabel={isEditing ? 'Texto de tu respuesta' : 'Escribe tu respuesta'}
          value={dock.text}
          onChangeText={dock.setText}
          placeholder={'Responde como ' + authorName}
          placeholderTextColor={theme.ink3}
          // un poco de margen: el límite real lo pone la base de datos y countCharacters
          maxLength={COMMENT_MAX_LENGTH + 50}
          multiline
          style={[styles.field, { backgroundColor: theme.surface, borderColor: theme.line, color: theme.ink }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isEditing ? 'Guardar cambios' : 'Enviar respuesta'}
          accessibilityState={{ disabled: !dock.canSend }}
          disabled={!dock.canSend}
          onPress={sendAndScroll}
          style={({ pressed }) => [
            styles.send,
            { backgroundColor: theme.ink },
            !dock.canSend && styles.sendDisabled,
            pressed && styles.sendPressed,
          ]}>
          <LineIcon name={isEditing ? 'check' : 'send'} color="paper" size={22} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  editing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: space.s3,
    paddingHorizontal: space.gutter,
  },
  error: {
    paddingTop: space.s2,
    paddingHorizontal: space.gutter,
  },
  pad: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.s3,
    paddingTop: space.s3,
    paddingHorizontal: space.gutter,
    paddingBottom: space.s2,
  },
  field: {
    flex: 1,
    minHeight: space.s12,
    maxHeight: 140,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: space.s4,
    paddingTop: space.s3,
    paddingBottom: space.s3,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    lineHeight: Math.round(fontSize.body * 1.4),
  },
  send: {
    width: space.s12,
    height: space.s12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendPressed: {
    opacity: 0.8,
  },
});
