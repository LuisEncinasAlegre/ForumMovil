import { StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';

import { Button } from './Button';
import { Text } from './Text';

type MessageProps = {
  title: string;
  // sin explicación cuando el título ya lo dice todo
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
};

// Estado vacío o de error: una frase grande, una explicación si hace falta y, si hace falta, una acción.
export function Message({ title, body, actionLabel, onAction }: MessageProps) {
  return (
    <View style={styles.message}>
      <Text variant="titleXl" weight="medium" accessibilityRole="header">
        {title}
      </Text>
      {body ? (
        <Text variant="body" color="ink2">
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} stretch={false} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  message: {
    paddingTop: space.s12 + space.s6,
    paddingHorizontal: space.gutter,
    gap: space.s3,
  },
  action: {
    paddingTop: space.s3,
  },
});
