import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { parseApiError } from '@/lib/api';
import { getUserId } from '@/lib/storage';

interface State<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

/**
 * Loads data for the current user whenever the screen gains focus.
 * Exposes `refresh` (pull-to-refresh) and `reload` (silent, after a mutation).
 */
export function useFocusData<T>(loader: (userId: string) => Promise<T>) {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, refreshing: false, error: null });
  const userIdRef = useRef<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async (mode: 'initial' | 'refresh' | 'silent') => {
    setState((s) => ({ ...s, loading: mode === 'initial' && !s.data, refreshing: mode === 'refresh' }));
    try {
      const userId = userIdRef.current ?? (await getUserId());
      userIdRef.current = userId;
      const data = await loaderRef.current(userId);
      setState({ data, loading: false, refreshing: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, refreshing: false, error: parseApiError(err) }));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      run('initial');
    }, [run])
  );

  return {
    ...state,
    userId: userIdRef.current,
    refresh: () => run('refresh'),
    reload: () => run('silent'),
  };
}
