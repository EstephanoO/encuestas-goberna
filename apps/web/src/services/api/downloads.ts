import { supabase } from '../supabase';

/**
 * Fetch the current download count for a department.
 */
export async function getDownloadCount(departmentId: string): Promise<number> {
  const { data } = await supabase
    .from('download_counts')
    .select('count')
    .eq('department_id', departmentId)
    .maybeSingle();

  return data?.count ?? 0;
}

/**
 * Increment the download count for a department and return the new value.
 */
export async function incrementDownloadCount(departmentId: string): Promise<number> {
  const { data: existing } = await supabase
    .from('download_counts')
    .select('count')
    .eq('department_id', departmentId)
    .maybeSingle();

  const newCount = (existing?.count ?? 0) + 1;

  if (existing) {
    await supabase
      .from('download_counts')
      .update({ count: newCount, updated_at: new Date().toISOString() })
      .eq('department_id', departmentId);
  } else {
    await supabase
      .from('download_counts')
      .insert({
        department_id: departmentId,
        count: newCount,
        updated_at: new Date().toISOString(),
      });
  }

  return newCount;
}
