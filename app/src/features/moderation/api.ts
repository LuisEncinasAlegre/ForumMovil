// Único archivo de moderación que habla con Supabase: avisos, teléfonos y baneos.
// Los avisos y los baneos los escribe moderación; la app solo los lee.
import { supabase } from '@/lib/supabase';

import type { ActiveBan, DeviceInfo, ModerationNotice, NoticeCategory } from './types';

const NOTICE_COLUMNS = 'id, post_id, comment_id, category, message, excerpt, counts_as_warning, created_at';

// RLS ya limita a tus avisos. Los retirados (moderación lo restauró) no se muestran.
export async function fetchUnseenNotices(): Promise<ModerationNotice[]> {
  const { data, error } = await supabase
    .from('moderation_notices')
    .select(NOTICE_COLUMNS)
    .is('seen_at', null)
    .is('withdrawn_at', null)
    .order('id', { ascending: true });
  if (error) {
    throw error;
  }
  // la base solo acepta estas cuatro categorías (check)
  return data.map((notice) => ({
    ...notice,
    category: notice.category as NoticeCategory,
  }));
}

// Advertencias que cuentan: no las automáticas por reportes ni las retiradas.
export async function countActiveWarnings(): Promise<number> {
  const { count, error } = await supabase
    .from('moderation_notices')
    .select('id', { count: 'exact', head: true })
    .eq('counts_as_warning', true)
    .is('withdrawn_at', null);
  if (error) {
    throw error;
  }
  return count ?? 0;
}

export async function markNoticeSeen(noticeId: number): Promise<void> {
  // La hora la ponemos aquí; la base solo deja cambiar seen_at y solo en tus avisos.
  const { error } = await supabase
    .from('moderation_notices')
    .update({ seen_at: new Date().toISOString() })
    .eq('id', noticeId);
  if (error) {
    throw error;
  }
}

// Registrar el mismo teléfono otra vez no hace nada (ignoreDuplicates). El user_id lo pone la base.
export async function registerDevice(device: DeviceInfo): Promise<void> {
  const { error } = await supabase
    .from('user_devices')
    .upsert({ device_id: device.deviceId, platform: device.platform }, { ignoreDuplicates: true });
  if (error) {
    throw error;
  }
}

// null = puedes escribir. Solo trae tu motivo y la fecha, nunca quién te baneó.
export async function fetchMyActiveBan(): Promise<ActiveBan | null> {
  const { data, error } = await supabase.rpc('get_my_active_ban');
  if (error) {
    throw error;
  }
  const ban = data[0];
  if (!ban) {
    return null;
  }
  // los tipos generados no saben que ends_at puede ser null (baneo sin fecha de fin)
  return { reason: ban.reason, endsAt: (ban.ends_at as string | null) ?? null };
}
