// Único archivo que habla con la tabla reports.
import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

import type { ReportReason, ReportResult, ReportTarget } from './types';

type ReportInsert = Database['public']['Tables']['reports']['Insert'];

// Sin .select(): la tabla no se puede leer desde la app, ni lo que tú mismo reportaste.
export async function createReport(target: ReportTarget, reason: ReportReason): Promise<ReportResult> {
  // quien reporta y la fecha los pone la base de datos
  const row: ReportInsert =
    target.kind === 'post' ? { post_id: target.postId, reason } : { comment_id: target.commentId, reason };
  const { error } = await supabase.from('reports').insert(row);
  // 23505 = ya existe un reporte tuyo de esto (unique). Para la persona es como si se enviara.
  if (error?.code === '23505') {
    return 'alreadyReported';
  }
  if (error) {
    throw error;
  }
  return 'sent';
}
