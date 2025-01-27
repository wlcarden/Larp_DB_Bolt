import { supabase } from './supabase';

export async function getUserDisplayNames(userIds: string[]): Promise<Record<string, string>> {
  if (!userIds || userIds.length === 0) return {};

  try {
    const { data: users, error } = await supabase.rpc('get_user_metadata', {
      user_ids: userIds
    });

    if (error) {
      console.error('Error fetching user data:', error);
      // Return email addresses as fallback
      const fallbackData = await supabase.auth.admin.listUsers();
      if (!fallbackData.error && fallbackData.data?.users) {
        return Object.fromEntries(
          fallbackData.data.users
            .filter(user => userIds.includes(user.id))
            .map(user => [user.id, user.email || 'Unknown User'])
        );
      }
      return Object.fromEntries(userIds.map(id => [id, 'Unknown User']));
    }

    return Object.fromEntries(
      users.map((user: { id: string, display_name: string }) => [
        user.id,
        user.display_name || 'Unknown User'
      ])
    );
  } catch (error) {
    console.error('Error in getUserDisplayNames:', error);
    // Return a fallback value with unknown users
    return Object.fromEntries(userIds.map(id => [id, 'Unknown User']));
  }
}

export async function getUserDisplayName(userId: string, gameId: string): Promise<string | null> {
  if (!userId || !gameId) return null;

  try {
    const { data, error } = await supabase
      .from('user_display_names')
      .select('display_name')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .single();

    if (error) {
      console.error('Error fetching display name:', error);
      // Try to get user email as fallback
      const { data: userData } = await supabase.auth.admin.listUsers();
      const user = userData?.users?.find(u => u.id === userId);
      return user?.email || null;
    }

    return data?.display_name || null;
  } catch (error) {
    console.error('Error in getUserDisplayName:', error);
    return null;
  }
}