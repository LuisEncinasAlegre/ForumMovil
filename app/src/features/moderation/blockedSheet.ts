import { router } from 'expo-router';

import type { SheetContent } from '@/ui/useActionSheet';

import { banTitle } from './banText';
import type { ActiveBan } from './types';

// En lugar del menú "⋯": con la cuenta suspendida no puedes reportar, editar ni eliminar.
export function blockedSheetContent(ban: ActiveBan): SheetContent {
  return {
    title: banTitle(ban),
    message: 'Mientras tanto no puedes reportar, editar ni eliminar. Sí puedes seguir leyendo.',
    actions: [{ label: 'Ver por qué', onPress: () => router.push('/suspendida') }],
  };
}
