// Único archivo que habla con la tabla moderation_notices. Solo lee y marca como visto:
// los avisos los escribe la base de datos cuando moderación oculta algo.
import { supabase } from '@/lib/supabase';

import type { ModerationNotice, NoticeCategory } from './types';

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
