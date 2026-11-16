import { router } from 'expo-router';
import { Alert } from 'react-native';

import { banTitle } from './banText';
import type { ActiveBan } from './types';

// En lugar del menú "⋯": con la cuenta suspendida no puedes reportar, editar ni eliminar.
export function showBlockedAlert(ban: ActiveBan): void {
  Alert.alert(banTitle(ban), 'Mientras tanto no puedes reportar, editar ni eliminar. Sí puedes seguir leyendo.', [
    { text: 'Ver por qué', onPress: () => router.push('/suspendida') },
    { text: 'Cancelar', style: 'cancel' },
  ]);
}
