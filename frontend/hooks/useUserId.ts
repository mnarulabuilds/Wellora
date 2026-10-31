import { useEffect, useState } from 'react';

import { getUserId } from '@/lib/storage';

/** Stable per-install user id (null until loaded from storage). */
export function useUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    getUserId().then((id) => mounted && setUserId(id));
    return () => {
      mounted = false;
    };
  }, []);
  return userId;
}
