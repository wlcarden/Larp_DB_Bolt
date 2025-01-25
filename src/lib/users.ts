import { supabase } from './supabase';

export async function getUserDisplayNames(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};

  const { data: users, error } = await supabase.rpc('get_user_metadata', {
    user_ids: userIds
  });

  if (error) {
    console.error('Error fetching user data:', error);
    return {};
  }

  return Object.fromEntries(
    users.map((user: { id: string, display_name: string }) => [user.id, user.display_name || 'Unknown'])
  );
}

export async function getUserDisplayName(userId: string, gameId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_display_names')
    .select('display_name')
    .eq('user_id', userId)
    .eq('game_id', gameId)
    .single();

  if (error) {
    console.error('Error fetching display name:', error);
    return null;
  }

  return data?.display_name || null;
}