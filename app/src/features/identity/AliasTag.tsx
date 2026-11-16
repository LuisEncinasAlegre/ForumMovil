import { StyleSheet, View } from 'react-native';

import type { Profile } from '@/features/session/types';
import { radius, space } from '@/theme/tokens';
import { Text } from '@/ui/Text';

import { getSealColor } from './sealColor';

type AliasTagProps = {
  // restriction viene con los autores de publicaciones y respuestas; tu perfil no la trae
  author: Pick<Profile, 'id' | 'color' | 'display_name'> & { restriction?: string | null };
};

const RESTRICTION_LABELS: Record<string, string> = {
  suspended: 'suspendido',
  banned: 'baneado',
};

// Cuadrito del color del sello y el alias, como firma de una publicación (components/identity.elyx).
export function AliasTag({ author }: AliasTagProps) {
  const restrictionLabel = author.restriction ? RESTRICTION_LABELS[author.restriction] : undefined;

  return (
    <View style={styles.tag}>
      <View style={[styles.seal, { backgroundColor: getSealColor(author) }]} />
      <Text variant="small" weight="medium" color="ink2">
        {author.display_name}
        {restrictionLabel ? (
          <Text variant="small" color="ink3">
            {' · ' + restrictionLabel}
          </Text>
        ) : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  seal: {
    width: 9,
    height: 9,
    borderRadius: radius.xs,
  },
});
