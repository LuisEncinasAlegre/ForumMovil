import type { Tables } from '@/lib/database.types';

// Las mismas cuatro categorías que los reportes (check de moderation_notices.category).
export type NoticeCategory = 'spam' | 'acoso' | 'inapropiado' | 'otro';

// Un aviso de moderación: algo tuyo se ocultó y por qué.
export type ModerationNotice = Pick<
  Tables<'moderation_notices'>,
  'id' | 'post_id' | 'comment_id' | 'message' | 'excerpt' | 'counts_as_warning' | 'created_at'
> & {
  category: NoticeCategory;
};

// Lo que se ve junto al alias de alguien suspendido o baneado (campo calculado restriction).
export type AccountRestriction = 'suspended' | 'banned';

// Tu suspensión o baneo vigente. endsAt null = sin fecha de fin.
export type ActiveBan = {
  reason: string;
  endsAt: string | null;
};

// El identificador de este teléfono que se registra al iniciar sesión.
export type DeviceInfo = {
  deviceId: string;
  platform: 'ios' | 'android';
};
