import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosError } from 'axios';

import { apiClient } from '../api/client';
import { drainOfflineQueue } from '../api/offline';
import { getOfflineQueue, queueOfflineAction } from '../storage';

const networkError = () => new AxiosError('down', 'ERR_NETWORK');
const validationError = () =>
  new AxiosError('bad', 'ERR_BAD_REQUEST', undefined, undefined, { status: 422, data: {} } as any);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

describe('drainOfflineQueue', () => {
  it('replays every queued action in order and empties the queue', async () => {
    const post = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: {} } as any);
    await queueOfflineAction('log_activity', { details: 'a' });
    await queueOfflineAction('save_profile', { profile: { userId: 'u', name: 'A' } });

    expect(await drainOfflineQueue()).toBe(2);
    expect(post.mock.calls.map((c) => c[0])).toEqual(['/log_activity', '/users/profile']);
    expect(await getOfflineQueue()).toHaveLength(0);
  });

  it('stops at the first network failure and keeps the rest', async () => {
    jest.spyOn(apiClient, 'post').mockRejectedValue(networkError());
    await queueOfflineAction('log_activity', { details: 'a' });
    await queueOfflineAction('log_activity', { details: 'b' });

    expect(await drainOfflineQueue()).toBe(0);
    expect(await getOfflineQueue()).toHaveLength(2);
  });

  it('drops items the server rejects so they cannot block the queue', async () => {
    jest
      .spyOn(apiClient, 'post')
      .mockRejectedValueOnce(validationError())
      .mockResolvedValueOnce({ data: {} } as any);
    await queueOfflineAction('log_activity', { details: 'bad' });
    await queueOfflineAction('log_activity', { details: 'good' });

    expect(await drainOfflineQueue()).toBe(1);
    expect(await getOfflineQueue()).toHaveLength(0);
  });
});
