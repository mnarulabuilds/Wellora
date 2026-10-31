import { getOfflineQueue, removeOfflineAction } from '../storage';
import { apiClient, isNetworkError } from './client';
import { profileToApi } from './mappers';

/**
 * Replay queued writes in order. Stops at the first network failure (still offline);
 * drops items the server rejects (e.g. validation) so they can't block the queue forever.
 */
export async function drainOfflineQueue(): Promise<number> {
  const queue = await getOfflineQueue();
  let synced = 0;
  for (const item of queue) {
    try {
      if (item.type === 'log_activity') {
        await apiClient.post('/log_activity', item.payload);
      } else if (item.type === 'save_profile') {
        await apiClient.post('/users/profile', profileToApi((item.payload as any).profile));
      }
      synced++;
      await removeOfflineAction(item.id);
    } catch (err) {
      if (isNetworkError(err)) break;
      await removeOfflineAction(item.id);
    }
  }
  return synced;
}
